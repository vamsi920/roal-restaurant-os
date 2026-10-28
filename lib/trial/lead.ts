import { startConvaiOutboundCall } from "@/lib/elevenlabs";
import { getElevenLabsAgentPhoneNumberId } from "@/lib/env.server";
import { toE164Phone } from "@/lib/phone/e164";
import { ensureTrialAgentId, ensureVoiceReady } from "@/lib/trial/elevenlabs";
import { pickTrialGreeting } from "@/lib/trial/prompt";
import { countTrialCallsLast24h, requireTrialDb, trialDailyCallCap, updateTrial } from "@/lib/trial/store";
import type { TrialRecord } from "@/lib/trial/types";
import { resolveTrialPersona } from "@/lib/trial/voices";

export type LeadAnswers = { missedCalls?: string; ticket?: string };

export type LeadInput = {
  name: string;
  phone: string;
  email: string;
  answers?: LeadAnswers;
};

export type ValidLead = { name: string; phone: string; email: string; answers: LeadAnswers };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ANSWER_RE = /^[a-z0-9_-]{1,24}$/;

/** Validate the funnel's contact form. Returns field errors keyed by field name. */
export function validateLead(raw: unknown): { ok: true; lead: ValidLead } | { ok: false; errors: Record<string, string> } {
  const body = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const errors: Record<string, string> = {};

  const name = typeof body.name === "string" ? body.name.trim().replace(/\s+/g, " ") : "";
  if (name.length < 2) errors.name = "Tell us your name.";
  else if (name.length > 80) errors.name = "That name is too long.";

  const phone = toE164Phone(typeof body.phone === "string" ? body.phone : null);
  if (!phone) errors.phone = "Enter a phone number we can call, like (512) 555-0199.";

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(email) || email.length > 160) errors.email = "Enter a valid email.";

  const rawAnswers = (body.answers && typeof body.answers === "object" ? body.answers : {}) as Record<string, unknown>;
  const answers: LeadAnswers = {};
  for (const key of ["missedCalls", "ticket"] as const) {
    const v = rawAnswers[key];
    if (typeof v === "string" && ANSWER_RE.test(v)) answers[key] = v;
  }

  if (Object.keys(errors).length || !phone) return { ok: false, errors };
  return { ok: true, lead: { name, phone, email, answers } };
}

export type LeadCallStatus = "placed" | "unavailable" | "failed" | "busy";

/** Ask the trial host to ring the owner when an outbound line is configured. */
async function placeTrialCall(trial: TrialRecord, toNumber: string): Promise<LeadCallStatus> {
  const phoneNumberId = getElevenLabsAgentPhoneNumberId();
  if (!phoneNumberId || !trial.prompt || !trial.greeting) return "unavailable";
  if (trial.call_count >= 12 || (await countTrialCallsLast24h()) >= trialDailyCallCap()) return "busy";
  try {
    const persona = resolveTrialPersona(trial.persona, trial.restaurant_name, trial.profile?.cuisine);
    await startConvaiOutboundCall({
      agentId: await ensureTrialAgentId(),
      agentPhoneNumberId: phoneNumberId,
      toNumber,
      conversationConfigOverride: {
        agent: {
          prompt: { prompt: trial.prompt },
          first_message: pickTrialGreeting({
            restaurantName: trial.restaurant_name ?? trial.profile?.name ?? "",
            agentName: persona.agentName,
            timezone: trial.profile?.timezone,
          }),
          language: persona.language,
        },
        tts: { voice_id: await ensureVoiceReady(persona.voiceId) },
      },
    });
    await updateTrial(trial.id, { call_count: trial.call_count + 1 });
    return "placed";
  } catch (e) {
    console.error("[trial lead call]", e instanceof Error ? e.message : e);
    return "failed";
  }
}

/** Save (or replace) the trial's lead, then try to place the demo call. */
export async function saveTrialLead(trial: TrialRecord, lead: ValidLead): Promise<{ callStatus: LeadCallStatus }> {
  const db = requireTrialDb();
  const nowIso = new Date().toISOString();
  const row = {
    trial_id: trial.id,
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
    answers: lead.answers,
    restaurant_name: trial.restaurant_name,
    source_input: trial.source_input,
    updated_at: nowIso,
  };
  const { error } = await db.from("trial_leads").upsert(row);
  if (error) throw new Error(error.message);

  const callStatus = trial.status === "ready" ? await placeTrialCall(trial, lead.phone) : "unavailable";
  await db.from("trial_leads").update({ call_status: callStatus, updated_at: nowIso }).eq("trial_id", trial.id);
  return { callStatus };
}
