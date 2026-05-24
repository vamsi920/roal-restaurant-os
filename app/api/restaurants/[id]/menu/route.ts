import { NextResponse } from "next/server";
import { requireRestaurantAccess } from "@/lib/auth/context-server";
import {
  createServerSupabase,
  getServiceRoleSupabase,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

function parseDeletedCount(data: unknown): number {
  if (typeof data === "number" && Number.isFinite(data)) return data;
  if (typeof data === "string") {
    const n = parseInt(data, 10);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const restaurantId = params.id;
    if (!restaurantId) {
      return NextResponse.json({ error: "missing restaurant id" }, { status: 400 });
    }

    const access = await requireRestaurantAccess(restaurantId);
    if (access.errorResponse) return access.errorResponse;

    const admin = getServiceRoleSupabase();
    if (admin) {
      const { data: deletedRows, error } = await admin
        .from("categories")
        .delete()
        .eq("restaurant_id", restaurantId)
        .select("id");

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        ok: true,
        deleted_categories: deletedRows?.length ?? 0,
        via: "service_role",
      });
    }

    const supabase = await createServerSupabase();
    const { data: deletedCount, error } = await supabase.rpc(
      "clear_restaurant_menu",
      { p_restaurant_id: restaurantId }
    );

    if (error) {
      const msg = error.message ?? "delete failed";
      if (/restaurant not found/i.test(msg)) {
        return NextResponse.json({ error: msg }, { status: 404 });
      }
      return NextResponse.json(
        {
          error: `${msg} — add SUPABASE_SERVICE_ROLE_KEY to server env for reliable clears, or apply migration 006_clear_menu_rpc.`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      deleted_categories: parseDeletedCount(deletedCount),
      via: "rpc",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
