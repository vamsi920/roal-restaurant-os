import { NextResponse } from "next/server";
import { requireRestaurantAccess } from "@/lib/auth/context-server";
import { listRecentMenuImports } from "@/lib/scanner/menu-import-audit";
import { createServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const restaurantId = params.id;
    const access = await requireRestaurantAccess(restaurantId);
    if (access.errorResponse) return access.errorResponse;

    const supabase = await createServerSupabase();
    const imports = await listRecentMenuImports(supabase, restaurantId, 25);

    return NextResponse.json({ ok: true, imports });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
