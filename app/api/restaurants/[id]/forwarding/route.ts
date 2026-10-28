import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRestaurantAccess } from "@/lib/auth/context-server";
import { getDb } from "@/lib/db";
import { CARRIERS } from "@/lib/forwarding/carriers";
import { loadForwardingRow, loadForwardingSummary, saveForwardingRow } from "@/lib/forwarding/state";
import { detectLiveForwardedCalls } from "@/lib/forwarding/twilio-check";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  carrier: z.enum(CARRIERS.map((c) => c.id) as [string, ...string[]]).optional(),
  mode: z.enum(["backup", "all"]).optional(),
});

/** GET: current forwarding status. Also looks for real forwarded calls in the last week. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const access = await requireRestaurantAccess(params.id);
  if (access.errorResponse) return access.errorResponse;
  const db = getDb();
  const row = await loadForwardingRow(db, params.id);
  if (row.status !== "on") {
    await detectLiveForwardedCalls(db, params.id, new Date(Date.now() - 7 * 864e5)).catch(() => null);
  }
  return NextResponse.json(await loadForwardingSummary(db, params.id));
}

/** PATCH { carrier?, mode? }: remember the owner's choices. */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const access = await requireRestaurantAccess(params.id);
  if (access.errorResponse) return access.errorResponse;
  const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid choice." }, { status: 400 });
  const db = getDb();
  const row = await loadForwardingRow(db, params.id);
  await saveForwardingRow(db, params.id, {
    ...(parsed.data.carrier ? { carrier: parsed.data.carrier as typeof row.carrier } : {}),
    ...(parsed.data.mode ? { mode: parsed.data.mode } : {}),
    ...(row.status === "not_started" ? { status: "pending" as const } : {}),
  });
  return NextResponse.json(await loadForwardingSummary(db, params.id));
}
