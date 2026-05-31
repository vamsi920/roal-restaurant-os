import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const TEST_HARNESS_SESSION_PREFIX = "roal-harness-";

function isTestHarnessSessionId(sessionId: string): boolean {
  return sessionId.trim().startsWith(TEST_HARNESS_SESSION_PREFIX);
}

export type MarkAgentCallOrderCompletedInput = {
  restaurantId: string;
  sessionId: string;
  linkedAgentId?: string | null;
  completedAt?: string;
};

type ExistingCallEventRow = {
  agent_id?: string | null;
  caller_phone?: string | null;
  started_at?: string | null;
  transcript_metadata?: Record<string, unknown> | null;
};

function buildOrderCompletedCallEventRow(
  input: MarkAgentCallOrderCompletedInput & {
    existing?: ExistingCallEventRow | null;
    now?: string;
  }
): Record<string, unknown> {
  const now = input.now ?? new Date().toISOString();
  const sessionId = input.sessionId.trim();
  const completedAt = input.completedAt?.trim() || now;
  const existingMeta = input.existing?.transcript_metadata ?? {};
  const isHarness = isTestHarnessSessionId(sessionId);

  return {
    restaurant_id: input.restaurantId.trim(),
    session_id: sessionId,
    conversation_id: sessionId,
    agent_id: input.existing?.agent_id ?? input.linkedAgentId?.trim() ?? null,
    caller_phone: input.existing?.caller_phone ?? null,
    status: "ended",
    outcome: "order_completed",
    started_at: input.existing?.started_at ?? completedAt,
    ended_at: completedAt,
    transcript_metadata: {
      ...existingMeta,
      order_finalized_at: completedAt,
      ...(isHarness || existingMeta.is_test_harness === true
        ? { is_test_harness: true }
        : {}),
    },
    updated_at: now,
  };
}

export async function markAgentCallOrderCompleted(
  supabase: SupabaseClient,
  input: MarkAgentCallOrderCompletedInput
): Promise<{ stored: boolean; reason?: string }> {
  const restaurantId = input.restaurantId.trim();
  const sessionId = input.sessionId.trim();
  if (!restaurantId || !sessionId) {
    return { stored: false, reason: "missing_restaurant_or_session" };
  }

  const { data: existing } = await supabase
    .from("agent_call_events")
    .select("agent_id, caller_phone, started_at, transcript_metadata")
    .eq("restaurant_id", restaurantId)
    .eq("session_id", sessionId)
    .maybeSingle();

  const row = buildOrderCompletedCallEventRow({
    ...input,
    existing: existing as ExistingCallEventRow | null,
  });

  const { error } = await supabase
    .from("agent_call_events")
    .upsert(row, { onConflict: "restaurant_id,session_id" });

  if (error) throw new Error(error.message);
  return { stored: true };
}
