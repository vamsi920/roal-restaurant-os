import { NextResponse } from "next/server";
import { requireRestaurantAccess } from "@/lib/auth/context-server";
import { getDb } from "@/lib/db";
import { loadLiveCallStatusPayload } from "@/lib/live/load-live-orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

/** GET — draft order statuses only (menu page "Call in progress" badge). */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireRestaurantAccess(params.id);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const payload = await loadLiveCallStatusPayload(getDb(), auth.access.restaurant.id);
    return NextResponse.json(payload, { headers: NO_STORE });
  } catch (e) {
    console.error("[live call-status]", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Could not load call status." }, { status: 500, headers: NO_STORE });
  }
}
