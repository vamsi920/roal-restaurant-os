import { NextResponse } from "next/server";
import { requireTrialFromCookie } from "@/lib/trial/auth";
import { composeTrialAgent } from "@/lib/trial/pipeline";
import { toPublicView } from "@/lib/trial/store";

export const runtime = "nodejs";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireTrialFromCookie(params.id);
  if (!auth.ok) return auth.response;
  try {
    const trial = await composeTrialAgent(auth.trial.id);
    return NextResponse.json({ trial: toPublicView(trial) });
  } catch (e) {
    console.error("[try agent]", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Could not build the agent. Try again." }, { status: 500 });
  }
}
