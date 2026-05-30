import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { requireRestaurantAccess } from "@/lib/auth/context-server";
import { buildReviewHints } from "@/lib/menu-import/review-hints";
import type { MenuImportStatus } from "@/lib/menu-import/audit-types";
import { ScannedMenuSchema } from "@/lib/menu-import/types";
import { commitMenuToRestaurant } from "@/lib/scanner/commit-menu";
import { commitBlockedReason } from "@/lib/scanner/import-commit-guards";
import {
  getMenuImportForRestaurant,
  recordMenuImportCommitFailed,
  recordMenuImportCommitted,
} from "@/lib/scanner/menu-import-audit";
import { createServerSupabase } from "@/lib/supabase/server";
import { recordRestaurantUsage } from "@/lib/usage/record";
import {
  syncRestaurantAgentAfterContentChange,
  VOICE_AGENT_CONTENT_SYNC_TRIGGERS,
} from "@/lib/voice-agent/sync-restaurant-agent-after-content-change";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  let body: {
    restaurant_id?: string;
    menu?: unknown;
    import_id?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const restaurantId = body.restaurant_id;
  const importId =
    typeof body.import_id === "string" && body.import_id
      ? body.import_id
      : null;

  try {
    if (typeof restaurantId !== "string" || !restaurantId) {
      return NextResponse.json(
        { error: "restaurant_id is required" },
        { status: 400 }
      );
    }

    const access = await requireRestaurantAccess(restaurantId);
    if (access.errorResponse) return access.errorResponse;

    const parsed = ScannedMenuSchema.safeParse(body.menu);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid menu payload",
          details: parsed.error.flatten(),
        },
        { status: 422 }
      );
    }

    const hints = buildReviewHints(parsed.data);
    const blocking = hints.filter((h) => h.severity === "error");
    if (blocking.length > 0) {
      return NextResponse.json(
        {
          error: "Fix validation issues before committing",
          hints: blocking,
        },
        { status: 422 }
      );
    }

    const supabase = await createServerSupabase();

    if (importId) {
      const row = await getMenuImportForRestaurant(
        supabase,
        restaurantId,
        importId
      );
      if (!row) {
        return NextResponse.json({ error: "Import not found" }, { status: 404 });
      }
      const blocked = commitBlockedReason(
        row.extraction_status as MenuImportStatus
      );
      if (blocked) {
        return NextResponse.json({ error: blocked }, { status: 409 });
      }
    }

    const { stats } = await commitMenuToRestaurant(restaurantId, parsed.data);

    if (importId) {
      await recordMenuImportCommitted(supabase, importId, stats);
    }

    void recordRestaurantUsage(supabase, {
      eventType: "import_attempt",
      organizationId: access.access.restaurant.organization_id,
      restaurantId,
      userId: access.context.user.id,
      idempotencyKey: importId
        ? `import_attempt:${importId}:committed`
        : `import_attempt:${restaurantId}:${Date.now()}`,
      metadata: {
        import_id: importId ?? undefined,
        outcome: "committed",
        category_count: stats.categories,
        item_count: stats.items,
        modifier_count: stats.modifiers,
      },
    });

    revalidatePath(`/dashboard/restaurants/${restaurantId}`);
    revalidatePath(`/dashboard/restaurants/${restaurantId}/menu`);

    void syncRestaurantAgentAfterContentChange({
      restaurantId,
      trigger: VOICE_AGENT_CONTENT_SYNC_TRIGGERS.scanner_commit,
      restaurantName: access.access.restaurant.name,
      userId: access.context.user.id,
    });

    return NextResponse.json({ ok: true, stats, import_id: importId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";

    if (importId && restaurantId) {
      try {
        const supabase = await createServerSupabase();
        await recordMenuImportCommitFailed(supabase, importId, message);
        const access = await requireRestaurantAccess(restaurantId);
        if (!access.errorResponse) {
          void recordRestaurantUsage(supabase, {
            eventType: "import_attempt",
            organizationId: access.access.restaurant.organization_id,
            restaurantId,
            userId: access.context.user.id,
            idempotencyKey: `import_attempt:${importId}:commit_failed`,
            metadata: {
              import_id: importId,
              outcome: "commit_failed",
              error_code: "commit_failed",
            },
          });
        }
      } catch {
        // best-effort audit update
      }
    }

    return NextResponse.json(
      { error: message, import_id: importId },
      { status: 500 }
    );
  }
}
