import { NextResponse } from "next/server";
import { requireRestaurantAccess } from "@/lib/auth/context-server";
import { getDb } from "@/lib/db";
import { loadLiveOrdersPayload } from "@/lib/live/load-live-orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

/** GET — Kitchen board snapshot (drafts, receipts, call evidence, active calls). Polled every few seconds. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireRestaurantAccess(params.id);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const payload = await loadLiveOrdersPayload(getDb(), {
      restaurantId: auth.access.restaurant.id,
      restaurantName: auth.access.restaurant.name,
    });
    return NextResponse.json(payload, { headers: NO_STORE });
  } catch (e) {
    console.error("[live orders]", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Could not load orders." }, { status: 500, headers: NO_STORE });
  }
}
