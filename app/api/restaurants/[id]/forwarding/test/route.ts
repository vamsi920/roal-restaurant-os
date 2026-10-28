import { NextResponse } from "next/server";
import { requireRestaurantAccess } from "@/lib/auth/context-server";
import { getDb } from "@/lib/db";
import { loadForwardingSummary } from "@/lib/forwarding/state";
import { checkForwardingTest, startForwardingTest } from "@/lib/forwarding/twilio-check";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST: place a silent test call from the ROAL line to the store number. */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const access = await requireRestaurantAccess(params.id);
  if (access.errorResponse) return access.errorResponse;
  const started = await startForwardingTest(getDb(), params.id);
  if (!started.ok) return NextResponse.json({ error: started.message, reason: started.reason }, { status: 409 });
  return NextResponse.json({ ok: true });
}

/** GET: poll the running test. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const access = await requireRestaurantAccess(params.id);
  if (access.errorResponse) return access.errorResponse;
  const db = getDb();
  try {
    const check = await checkForwardingTest(db, params.id);
    if (!check.done) return NextResponse.json({ done: false });
    return NextResponse.json({ done: true, result: check.result, forwarding: await loadForwardingSummary(db, params.id) });
  } catch (e) {
    console.error("[forwarding] test check failed", e);
    return NextResponse.json({ done: false });
  }
}
