import type { SupabaseClient } from "@supabase/supabase-js";
import {
  recordingUrlFromTranscriptMetadata,
  transcriptLinesFromMetadata,
} from "@/lib/call-history/build-call-history-rows";
import type { CallHistoryTranscriptLine } from "@/lib/call-history/types";

export type OrderCallEvidence = {
  sessionId: string;
  conversationId: string;
  outcome: string | null;
  startedAt: string | null;
  endedAt: string | null;
  transcriptSummary: string | null;
  transcriptLines: CallHistoryTranscriptLine[];
  recordingUrl: string | null;
};

export type AgentCallEventEvidenceRow = {
  session_id: string;
  conversation_id: string | null;
  outcome: string | null;
  started_at: string | null;
  ended_at: string | null;
  transcript_metadata: Record<string, unknown> | null;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function buildOrderCallEvidence(
  row: AgentCallEventEvidenceRow
): OrderCallEvidence | null {
  const sessionId = asString(row.session_id);
  if (!sessionId) return null;

  const metadata = row.transcript_metadata ?? {};
  const transcriptSummary =
    asString(metadata.transcript_summary) || asString(metadata.summary) || null;

  return {
    sessionId,
    conversationId: asString(row.conversation_id) || sessionId,
    outcome: asString(row.outcome) || null,
    startedAt: asString(row.started_at) || null,
    endedAt: asString(row.ended_at) || null,
    transcriptSummary,
    transcriptLines: transcriptLinesFromMetadata(metadata, 8),
    recordingUrl: recordingUrlFromTranscriptMetadata(metadata),
  };
}

export function indexOrderCallEvidence(
  rows: OrderCallEvidence[]
): Record<string, OrderCallEvidence> {
  return Object.fromEntries(rows.map((row) => [row.sessionId, row]));
}

export async function loadOrderCallEvidenceBySession(
  supabase: SupabaseClient,
  input: {
    restaurantId: string;
    sessionIds: string[];
    limit?: number;
  }
): Promise<Record<string, OrderCallEvidence>> {
  const restaurantId = input.restaurantId.trim();
  const sessionIds = [...new Set(input.sessionIds.map((id) => id.trim()).filter(Boolean))];
  if (!restaurantId || sessionIds.length === 0) return {};

  const { data, error } = await supabase
    .from("agent_call_events")
    .select(
      "session_id, conversation_id, outcome, started_at, ended_at, transcript_metadata"
    )
    .eq("restaurant_id", restaurantId)
    .in("session_id", sessionIds)
    .order("updated_at", { ascending: false })
    .limit(input.limit ?? sessionIds.length);

  if (error) {
    const msg = error.message ?? "";
    if (/agent_call_events/i.test(msg)) return {};
    throw new Error(error.message);
  }

  return indexOrderCallEvidence(
    ((data ?? []) as AgentCallEventEvidenceRow[])
      .map(buildOrderCallEvidence)
      .filter((row): row is OrderCallEvidence => row != null)
  );
}
