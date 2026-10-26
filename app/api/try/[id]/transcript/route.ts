import { NextResponse } from "next/server";
import { requireTrialFromCookie } from "@/lib/trial/auth";
import { scoreTranscript } from "@/lib/trial/scorecard";
import { toPublicView, updateTrial } from "@/lib/trial/store";
import type { TrialTranscriptTurn } from "@/lib/trial/types";

export const runtime = "nodejs";

/** Persist the last in-browser call transcript and auto-tick the scorecard. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireTrialFromCookie(params.id);
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => ({}))) as { turns?: unknown };
  const turns: TrialTranscriptTurn[] = [];
  if (Array.isArray(body.turns)) {
    for (const raw of body.turns.slice(0, 400)) {
      if (!raw || typeof raw !== "object") continue;
      const r = raw as Record<string, unknown>;
      const role = r.role === "agent" ? "agent" : r.role === "user" ? "user" : null;
      const text = typeof r.text === "string" ? r.text.trim().slice(0, 2000) : "";
      if (!role || !text) continue;
      turns.push({ role, text, at: typeof r.at === "number" ? r.at : Date.now() });
    }
  }

  try {
    const scorecard = scoreTranscript(turns, auth.trial.scorecard);
    const trial = await updateTrial(auth.trial.id, {
      transcript: turns.length ? turns : auth.trial.transcript,
      scorecard,
    });
    return NextResponse.json({ trial: toPublicView(trial) });
  } catch (e) {
    console.error("[try transcript]", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Could not save the transcript." }, { status: 500 });
  }
}
