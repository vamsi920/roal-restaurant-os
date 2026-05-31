import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceRoleSupabase } from "@/lib/supabase/server";
import { lookupRestaurantForElevenLabsAgent } from "@/lib/elevenlabs/conversation-init";
import type { AgentCallOutcome, AgentCallStatus } from "@/lib/agent-calls/types";
import { emitStaffHandoffRequested } from "@/lib/notifications/operational-events";

export const ELEVENLABS_WEBHOOK_SIGNATURE_HEADER = "elevenlabs-signature";
export const ELEVENLABS_WEBHOOK_TOLERANCE_SECONDS = 30 * 60;

type JsonRecord = Record<string, unknown>;

export type ElevenLabsPostCallEvent = {
  type: string;
  event_timestamp?: number | string;
  data?: JsonRecord;
};

export type ParsedElevenLabsCallEvent = {
  restaurantId: string;
  agentId: string | null;
  conversationId: string;
  sessionId: string;
  callerPhone: string | null;
  status: AgentCallStatus;
  outcome: AgentCallOutcome;
  startedAt: string;
  endedAt: string | null;
  transcriptMetadata: JsonRecord;
};

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function unixSecondsToIso(value: unknown): string | null {
  const num =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : NaN;
  if (!Number.isFinite(num)) return null;
  const ms = num > 10_000_000_000 ? num : num * 1000;
  const date = new Date(ms);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    const str = asString(value);
    if (str) return str;
  }
  return "";
}

function readDynamicVariables(data: JsonRecord): JsonRecord {
  return asRecord(asRecord(data.conversation_initiation_client_data).dynamic_variables);
}

function readCallerPhone(data: JsonRecord): string | null {
  const metadata = asRecord(data.metadata);
  const phoneCall = asRecord(metadata.phone_call);
  const twilio = asRecord(asRecord(metadata.body).body);
  const failureMetadata = asRecord(asRecord(data.metadata).body);

  const value = firstString(
    data.caller_phone,
    data.callerPhone,
    metadata.caller_phone,
    metadata.callerPhone,
    metadata.from_number,
    metadata.from,
    phoneCall.caller_id,
    phoneCall.external_number,
    phoneCall.from_number,
    twilio.From,
    twilio.Caller,
    failureMetadata.From,
    failureMetadata.Caller,
    failureMetadata.from_number
  );

  return value || null;
}

function transcriptHasSuccessfulFinalize(transcript: unknown): boolean {
  if (!Array.isArray(transcript)) return false;
  return transcript.some((turn) => {
    const row = asRecord(turn);
    const toolCalls = Array.isArray(row.tool_calls) ? row.tool_calls : [];
    const toolResults = Array.isArray(row.tool_results) ? row.tool_results : [];
    const all = [...toolCalls, ...toolResults].map((item) =>
      JSON.stringify(item ?? {}).toLowerCase()
    );
    return all.some(
      (blob) =>
        blob.includes("finalize_order") &&
        !blob.includes('"error"') &&
        !blob.includes("failed")
    );
  });
}

function inferOutcome(type: string, data: JsonRecord): AgentCallOutcome {
  if (type === "call_initiation_failure") return "abandoned";
  if (type === "post_call_audio") return "unknown";

  const analysis = asRecord(data.analysis);
  const callSuccessful = asString(analysis.call_successful).toLowerCase();
  if (transcriptHasSuccessfulFinalize(data.transcript)) return "order_completed";
  if (callSuccessful === "failure" || callSuccessful === "failed") return "abandoned";
  if (callSuccessful === "success") return "no_order";
  return "unknown";
}

function readHandoffFlags(data: JsonRecord): JsonRecord {
  const analysis = asRecord(data.analysis);
  const collection = asRecord(analysis.data_collection_results);
  const metadata = asRecord(data.metadata);
  const summary = asString(analysis.transcript_summary).toLowerCase();
  const handoffKeys = [
    "handoff_requested",
    "handoff_required",
    "manager_requested",
    "callback_requested",
    "escalation_requested",
  ];

  const flags: JsonRecord = {};
  for (const key of handoffKeys) {
    const raw = collection[key] ?? metadata[key] ?? data[key];
    if (raw === true || asString(raw).toLowerCase() === "true") {
      flags[key] = true;
    }
  }

  if (
    summary.includes("manager") ||
    summary.includes("handoff") ||
    summary.includes("call back") ||
    summary.includes("callback")
  ) {
    flags.handoff_requested = true;
  }

  return flags;
}

function readVoicemailFlags(data: JsonRecord): JsonRecord {
  const analysis = asRecord(data.analysis);
  const collection = asRecord(analysis.data_collection_results);
  const metadata = asRecord(data.metadata);
  const phoneCall = asRecord(metadata.phone_call);
  const summary = asString(analysis.transcript_summary).toLowerCase();
  const terminationReason = asString(metadata.termination_reason).toLowerCase();
  const voicemailKeys = [
    "voicemail_detected",
    "voicemail_detection",
    "voicemail",
    "left_voicemail",
    "is_voicemail",
  ];

  const flags: JsonRecord = {};
  for (const key of voicemailKeys) {
    const raw =
      collection[key] ??
      metadata[key] ??
      phoneCall[key] ??
      data[key];
    if (raw === true || asString(raw).toLowerCase() === "true") {
      flags.voicemail_detected = true;
      flags.voicemail_source = key;
      break;
    }
  }

  if (
    summary.includes("voicemail") ||
    summary.includes("voice mail") ||
    terminationReason.includes("voicemail") ||
    terminationReason.includes("voice mail")
  ) {
    flags.voicemail_detected = true;
  }

  return flags;
}

function safeHttpUrl(value: unknown): string | null {
  const raw = asString(value);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function readRecordingUrl(data: JsonRecord): string | null {
  const metadata = asRecord(data.metadata);
  const audio = asRecord(data.audio);
  const recording = asRecord(data.recording);
  const nestedAudio = asRecord(metadata.audio);
  const nestedRecording = asRecord(metadata.recording);

  return (
    safeHttpUrl(data.audio_url) ??
    safeHttpUrl(data.audioUrl) ??
    safeHttpUrl(data.recording_url) ??
    safeHttpUrl(data.recordingUrl) ??
    safeHttpUrl(data.signed_audio_url) ??
    safeHttpUrl(data.signedAudioUrl) ??
    safeHttpUrl(audio.url) ??
    safeHttpUrl(audio.audio_url) ??
    safeHttpUrl(recording.url) ??
    safeHttpUrl(recording.recording_url) ??
    safeHttpUrl(metadata.audio_url) ??
    safeHttpUrl(metadata.recording_url) ??
    safeHttpUrl(metadata.signed_audio_url) ??
    safeHttpUrl(nestedAudio.url) ??
    safeHttpUrl(nestedRecording.url)
  );
}

function buildTranscriptMetadata(event: ElevenLabsPostCallEvent): JsonRecord {
  const data = asRecord(event.data);
  const analysis = asRecord(data.analysis);
  const metadata = asRecord(data.metadata);

  return {
    event_type: event.type,
    event_timestamp: event.event_timestamp ?? null,
    transcript_summary: analysis.transcript_summary ?? null,
    call_successful: analysis.call_successful ?? null,
    termination_reason: metadata.termination_reason ?? null,
    call_duration_secs: metadata.call_duration_secs ?? null,
    cost: metadata.cost ?? null,
    recording_url: readRecordingUrl(data),
    transcript: Array.isArray(data.transcript) ? data.transcript : [],
    analysis,
    metadata,
    ...readHandoffFlags(data),
    ...readVoicemailFlags(data),
  };
}

export function staffHandoffReasonFromTranscriptMetadata(
  metadata: JsonRecord
): string | null {
  const handoffKeys = [
    "voicemail_detected",
    "handoff_requested",
    "handoff_required",
    "manager_requested",
    "callback_requested",
    "escalation_requested",
  ];

  for (const key of handoffKeys) {
    if (metadata[key] === true || asString(metadata[key]).toLowerCase() === "true") {
      return key;
    }
  }

  return null;
}

function parseSignatureHeader(header: string): { timestamp: string; signature: string } | null {
  const parts = Object.fromEntries(
    header.split(",").map((part) => {
      const [key, ...rest] = part.trim().split("=");
      return [key, rest.join("=")];
    })
  );
  const timestamp = parts.t?.trim() ?? "";
  const signature = parts.v0?.trim() ?? "";
  return timestamp && signature ? { timestamp, signature } : null;
}

export function verifyElevenLabsWebhookSignature(input: {
  rawBody: string;
  signatureHeader: string | null;
  secret: string;
  nowSeconds?: number;
}): boolean {
  const secret = input.secret.trim();
  if (!secret) return false;
  if (!input.signatureHeader) return false;
  const parsed = parseSignatureHeader(input.signatureHeader);
  if (!parsed) return false;

  const timestampNum = Number(parsed.timestamp);
  if (!Number.isFinite(timestampNum)) return false;
  const nowSeconds = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - timestampNum) > ELEVENLABS_WEBHOOK_TOLERANCE_SECONDS) {
    return false;
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${parsed.timestamp}.${input.rawBody}`, "utf8")
    .digest("hex");

  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(parsed.signature, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function resolveRestaurantId(input: {
  supabase: SupabaseClient;
  data: JsonRecord;
  agentId: string;
}): Promise<string | null> {
  const dynamicVariables = readDynamicVariables(input.data);
  const fromPayload = firstString(
    dynamicVariables.restaurant_id,
    dynamicVariables.roal_restaurant_id,
    input.data.restaurant_id,
    asRecord(input.data.metadata).restaurant_id
  );
  if (fromPayload) {
    const { data } = await input.supabase
      .from("restaurants")
      .select("id")
      .eq("id", fromPayload)
      .maybeSingle();
    if (data?.id) return String(data.id);
  }

  if (!input.agentId) return null;
  const resolved = await lookupRestaurantForElevenLabsAgent(input.agentId);
  return resolved?.restaurantId ?? null;
}

export async function parseElevenLabsPostCallEvent(
  event: ElevenLabsPostCallEvent,
  supabase: SupabaseClient
): Promise<ParsedElevenLabsCallEvent | null> {
  const data = asRecord(event.data);
  const agentId = firstString(data.agent_id, data.agentId) || "";
  const conversationId = firstString(data.conversation_id, data.conversationId);
  if (!conversationId) return null;

  const restaurantId = await resolveRestaurantId({ supabase, data, agentId });
  if (!restaurantId) return null;

  const metadata = asRecord(data.metadata);
  const startedAt =
    unixSecondsToIso(metadata.start_time_unix_secs) ??
    unixSecondsToIso(event.event_timestamp) ??
    new Date().toISOString();
  const duration =
    typeof metadata.call_duration_secs === "number"
      ? metadata.call_duration_secs
      : Number(metadata.call_duration_secs);
  const endedAt =
    Number.isFinite(duration) && duration > 0
      ? new Date(new Date(startedAt).getTime() + duration * 1000).toISOString()
      : unixSecondsToIso(event.event_timestamp);

  return {
    restaurantId,
    agentId: agentId || null,
    conversationId,
    sessionId: conversationId,
    callerPhone: readCallerPhone(data),
    status: "ended",
    outcome: inferOutcome(event.type, data),
    startedAt,
    endedAt,
    transcriptMetadata: buildTranscriptMetadata(event),
  };
}

export async function persistElevenLabsPostCallEvent(
  event: ElevenLabsPostCallEvent
): Promise<{ stored: boolean; reason?: string; parsed?: ParsedElevenLabsCallEvent }> {
  const supabase = getServiceRoleSupabase();
  if (!supabase) return { stored: false, reason: "missing_service_role" };

  const parsed = await parseElevenLabsPostCallEvent(event, supabase);
  if (!parsed) return { stored: false, reason: "unresolved_event" };

  const { error } = await supabase.from("agent_call_events").upsert(
    {
      restaurant_id: parsed.restaurantId,
      agent_id: parsed.agentId,
      conversation_id: parsed.conversationId,
      session_id: parsed.sessionId,
      caller_phone: parsed.callerPhone,
      status: parsed.status,
      outcome: parsed.outcome,
      started_at: parsed.startedAt,
      ended_at: parsed.endedAt,
      transcript_metadata: parsed.transcriptMetadata,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "restaurant_id,session_id" }
  );

  if (error) throw new Error(error.message);

  const handoffReason = staffHandoffReasonFromTranscriptMetadata(
    parsed.transcriptMetadata
  );
  if (handoffReason) {
    await emitStaffHandoffRequested(supabase, {
      restaurantId: parsed.restaurantId,
      sessionId: parsed.sessionId,
      conversationId: parsed.conversationId,
      callerPhone: parsed.callerPhone,
      outcome: parsed.outcome,
      reason: handoffReason,
      summary:
        typeof parsed.transcriptMetadata.transcript_summary === "string"
          ? parsed.transcriptMetadata.transcript_summary
          : null,
    });
  }

  return { stored: true, parsed };
}
