import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth/context-server";
import { getDb } from "@/lib/db";
import { loadLocationsForContext } from "@/lib/restaurant-list/load-locations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

/** GET — "All locations" cards for the caller's organizations only. */
export async function GET() {
  const auth = await requireAuthContext();
  if (auth.errorResponse) return auth.errorResponse;
  const payload = await loadLocationsForContext(getDb(), auth.context);
  return NextResponse.json(payload, {
    status: payload.error ? 500 : 200,
    headers: NO_STORE,
  });
}
