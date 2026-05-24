import { NextResponse } from "next/server";
import { EnvValidationError } from "@/lib/env.shared";
import { requireRestaurantAccess } from "@/lib/auth/context-server";
import {
  extractErrorHttpStatus,
  extractMenuFromImage,
  resolveMenuImageMimeType,
  validateMenuImageFile,
} from "@/lib/scanner/extract-menu";
import {
  createMenuImportRecord,
  recordMenuImportExtracted,
  recordMenuImportExtractionFailed,
  patchMenuImportStatus,
  uploadMenuImportFile,
} from "@/lib/scanner/menu-import-audit";
import { createServerSupabase } from "@/lib/supabase/server";
import { writeAuditLog } from "@/lib/observability/audit";
import { getRouteObservability } from "@/lib/observability/route-context";
import { assertOrganizationBillingGate } from "@/lib/billing/assert-gate";
import { planLimitJsonResponse } from "@/lib/billing/gate-http";
import { notifyScanFailure } from "@/lib/notifications/helpers";
import { recordRestaurantUsage } from "@/lib/usage/record";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const { requestId, log } = getRouteObservability(req, "api.scanner.extract");
  let importId: string | null = null;
  let usageScope: {
    supabase: Awaited<ReturnType<typeof createServerSupabase>>;
    organizationId: string;
    restaurantId: string;
    userId: string;
  } | null = null;

  try {
    const form = await req.formData();
    const restaurantId = form.get("restaurant_id");
    const image = form.get("image");

    if (typeof restaurantId !== "string" || !restaurantId) {
      return NextResponse.json(
        { error: "restaurant_id is required" },
        { status: 400 }
      );
    }

    const access = await requireRestaurantAccess(restaurantId);
    if (access.errorResponse) return access.errorResponse;

    if (!(image instanceof File)) {
      return NextResponse.json({ error: "image file is required" }, { status: 400 });
    }

    try {
      validateMenuImageFile(image);
    } catch (err) {
      const message = err instanceof Error ? err.message : "invalid image";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const supabase = await createServerSupabase();
    const { restaurant, role } = access.access;
    const userId = access.context.user.id;

    const menuScanGate = await assertOrganizationBillingGate(supabase, {
      organizationId: restaurant.organization_id,
      membershipRole: role,
      action: "menu_scan",
      additionalUsage: 1,
    });
    if (!menuScanGate.ok) {
      return planLimitJsonResponse(menuScanGate.verdict);
    }
    usageScope = {
      supabase,
      organizationId: restaurant.organization_id,
      restaurantId,
      userId,
    };

    const record = await createMenuImportRecord(supabase, {
      restaurantId,
      organizationId: restaurant.organization_id,
      uploadedBy: userId,
      originalFilename: image.name || "menu-upload.jpg",
      fileSizeBytes: image.size,
      mimeType: resolveMenuImageMimeType(image),
    });
    importId = record.id;

    const fileBytes = await image.arrayBuffer();
    const mimeType = resolveMenuImageMimeType(image);
    await uploadMenuImportFile(
      supabase,
      record.storage_path,
      fileBytes,
      mimeType
    );
    await patchMenuImportStatus(supabase, importId, {
      extraction_status: "uploaded",
    });

    const { menu, hints, modelUsed } = await extractMenuFromImage(image);

    const summary = {
      categories: menu.categories.length,
      items: menu.categories.reduce((n, c) => n + c.items.length, 0),
      modifiers: menu.categories.reduce(
        (n, c) =>
          n + c.items.reduce((m, i) => m + (i.modifiers?.length ?? 0), 0),
        0
      ),
      warnings: hints.filter((h) => h.severity === "warning").length,
      errors: hints.filter((h) => h.severity === "error").length,
    };

    await recordMenuImportExtracted(supabase, importId, {
      modelUsed,
      menu,
      hints,
      summary,
    });

    void recordRestaurantUsage(supabase, {
      eventType: "menu_scan",
      organizationId: restaurant.organization_id,
      restaurantId,
      userId,
      idempotencyKey: `menu_scan:${importId}`,
      metadata: {
        import_id: importId,
        outcome: "extracted",
        category_count: summary.categories,
        item_count: summary.items,
        model_used: modelUsed,
      },
    });
    void recordRestaurantUsage(supabase, {
      eventType: "import_attempt",
      organizationId: restaurant.organization_id,
      restaurantId,
      userId,
      idempotencyKey: `import_attempt:${importId}:created`,
      metadata: { import_id: importId, outcome: "uploaded" },
    });

    void writeAuditLog(supabase, {
      requestId,
      organizationId: restaurant.organization_id,
      restaurantId,
      userId,
      action: "menu_scan.extracted",
      resourceType: "menu_import",
      resourceId: importId,
      outcome: "success",
      metadata: summary,
    });
    log.info("menu_scan_extracted", {
      import_id: importId,
      restaurant_id: restaurantId,
      ...summary,
    });

    return NextResponse.json({
      ok: true,
      import_id: importId,
      restaurant_id: restaurantId,
      menu,
      hints,
      summary,
    });
  } catch (err) {
    if (importId && usageScope) {
      try {
        const message =
          err instanceof Error ? err.message : "unknown extraction error";
        await recordMenuImportExtractionFailed(usageScope.supabase, importId, message);
        void recordRestaurantUsage(usageScope.supabase, {
          eventType: "menu_scan",
          organizationId: usageScope.organizationId,
          restaurantId: usageScope.restaurantId,
          userId: usageScope.userId,
          idempotencyKey: `menu_scan:${importId}:failed`,
          metadata: {
            import_id: importId,
            outcome: "extraction_failed",
            error_code: "extraction_failed",
          },
        });
        const { data: restaurantRow } = await usageScope.supabase
          .from("restaurants")
          .select("name")
          .eq("id", usageScope.restaurantId)
          .maybeSingle();
        void notifyScanFailure(usageScope.supabase, {
          organizationId: usageScope.organizationId,
          restaurantId: usageScope.restaurantId,
          restaurantName: restaurantRow?.name ?? "Restaurant",
          importId,
          message,
        });
        void writeAuditLog(usageScope.supabase, {
          requestId,
          organizationId: usageScope.organizationId,
          restaurantId: usageScope.restaurantId,
          userId: usageScope.userId,
          action: "menu_scan.failed",
          resourceType: "menu_import",
          resourceId: importId,
          outcome: "failure",
          metadata: { message },
        });
        log.warn("menu_scan_failed", {
          import_id: importId,
          restaurant_id: usageScope.restaurantId,
          error: message,
        });
      } catch {
        // best-effort audit update
      }
    }

    if (err instanceof EnvValidationError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    const message = err instanceof Error ? err.message : "unknown error";
    const status = extractErrorHttpStatus(message);
    return NextResponse.json(
      { error: message, import_id: importId },
      { status }
    );
  }
}
