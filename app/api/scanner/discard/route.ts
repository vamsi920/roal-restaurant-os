import { NextResponse } from "next/server";
import { requireRestaurantAccess } from "@/lib/auth/context-server";
import {
  getMenuImportForRestaurant,
  recordMenuImportDiscarded,
} from "@/lib/scanner/menu-import-audit";
import { createServerSupabase } from "@/lib/supabase/server";
import { recordRestaurantUsage } from "@/lib/usage/record";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: {
    restaurant_id?: string;
    import_id?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {

    const restaurantId = body.restaurant_id;
    const importId = body.import_id;

    if (typeof restaurantId !== "string" || !restaurantId) {
      return NextResponse.json(
        { error: "restaurant_id is required" },
        { status: 400 }
      );
    }
    if (typeof importId !== "string" || !importId) {
      return NextResponse.json(
        { error: "import_id is required" },
        { status: 400 }
      );
    }

    const access = await requireRestaurantAccess(restaurantId);
    if (access.errorResponse) return access.errorResponse;

    const supabase = await createServerSupabase();
    const row = await getMenuImportForRestaurant(
      supabase,
      restaurantId,
      importId
    );

    if (!row) {
      return NextResponse.json({ error: "Import not found" }, { status: 404 });
    }

    if (row.extraction_status === "committed") {
      return NextResponse.json(
        { error: "Cannot discard a committed import" },
        { status: 409 }
      );
    }
    if (row.extraction_status === "discarded") {
      return NextResponse.json({ ok: true });
    }

    await recordMenuImportDiscarded(supabase, importId);

    void recordRestaurantUsage(supabase, {
      eventType: "import_attempt",
      organizationId: access.access.restaurant.organization_id,
      restaurantId,
      userId: access.context.user.id,
      idempotencyKey: `import_attempt:${importId}:discarded`,
      metadata: { import_id: importId, outcome: "discarded" },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
