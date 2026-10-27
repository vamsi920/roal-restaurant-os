import { NextResponse } from "next/server";
import { requireRestaurantAccess } from "@/lib/auth/context-server";
import { getDb } from "@/lib/db";
import { loadRestaurantMenu } from "@/lib/menu-editor/load-menu";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

/** GET — categories, items and modifiers for one restaurant (live menu polling). */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireRestaurantAccess(params.id);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const snapshot = await loadRestaurantMenu(getDb(), auth.access.restaurant.id);
    return NextResponse.json(
      { ...snapshot, serverTime: new Date().toISOString() },
      { headers: NO_STORE }
    );
  } catch (e) {
    console.error("[live menu]", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Could not load menu." }, { status: 500, headers: NO_STORE });
  }
}
