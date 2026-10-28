import { NextResponse } from "next/server";
import { requireRestaurantAccess } from "@/lib/auth/context-server";
import { getDb } from "@/lib/db";
import { ensureRestaurantVoiceHost } from "@/lib/voice-agent/ensure-voice-host";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Make sure this restaurant's phone host exists and is synced. The dashboard calls it in the
 * background whenever an owner opens a location, so nobody ever links or syncs anything by hand.
 */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireRestaurantAccess(params.id);
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const result = await ensureRestaurantVoiceHost(getDb(), {
      restaurantId: params.id,
      userId: auth.context.user.id,
    });
    return NextResponse.json(result);
  } catch (e) {
    console.error("[voice-host ensure]", e instanceof Error ? e.message : e);
    return NextResponse.json({ state: "failed", started: false }, { status: 500 });
  }
}
