import { NextResponse } from "next/server";
import { EnvValidationError } from "@/lib/env.shared";
import { requireTrialFromCookie } from "@/lib/trial/auth";
import { createTrialSignedUrl, ensureVoiceReady } from "@/lib/trial/elevenlabs";
import { composeTrialAgent } from "@/lib/trial/pipeline";
import { countTrialCallsLast24h, trialDailyCallCap, updateTrial } from "@/lib/trial/store";
import { resolveTrialPersona } from "@/lib/trial/voices";

export const runtime = "nodejs";

/** Mint a signed websocket URL + prompt overrides for an in-browser test call. */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireTrialFromCookie(params.id);
  if (!auth.ok) return auth.response;

  try {
    let trial = auth.trial as typeof auth.trial | Awaited<ReturnType<typeof composeTrialAgent>>;
    if (trial.status !== "ready" || !trial.prompt || !trial.greeting) {
      trial = await composeTrialAgent(auth.trial.id);
    }
    if (trial.status !== "ready" || !trial.prompt || !trial.greeting) {
      return NextResponse.json({ error: "Finish building the agent first." }, { status: 409 });
    }
    if (trial.call_count >= 12) {
      return NextResponse.json(
        { error: "You have used all the test calls for this session. Claim the agent to keep going." },
        { status: 429 }
      );
    }

    if ((await countTrialCallsLast24h()) >= trialDailyCallCap()) {
      return NextResponse.json(
        { error: "Test calls are busy right now. Try again in a little while, or sign up to test your own line." },
        { status: 503 }
      );
    }

    const persona = resolveTrialPersona(trial.persona, trial.restaurant_name, trial.profile?.cuisine);
    const [{ agentId, signedUrl }, voiceId] = await Promise.all([
      createTrialSignedUrl(),
      ensureVoiceReady(persona.voiceId),
    ]);
    await updateTrial(trial.id, { call_count: trial.call_count + 1 });

    return NextResponse.json({
      agentId,
      signedUrl,
      overrides: {
        agent: {
          prompt: { prompt: trial.prompt },
          firstMessage: trial.greeting,
          language: persona.language,
        },
        tts: { voiceId },
      },
    });
  } catch (e) {
    if (e instanceof EnvValidationError) {
      return NextResponse.json({ error: "Voice calls are not configured on this server yet." }, { status: 503 });
    }
    console.error("[try call]", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Could not start the call. Try again." }, { status: 500 });
  }
}
