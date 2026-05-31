import {
  classifyAgentCallOutcome,
  lineCountFromItems,
  resolveAgentCallStatus,
} from "@/lib/agent-calls/classify-outcome";
import { outcomeForVoicemailAwareCall } from "@/lib/agent-calls/voicemail-call";
import {
  AGENT_CALL_OUTCOMES,
  type AgentCallOutcome,
  type AgentCallSession,
  type DeriveAgentCallSessionsInput,
  type StoredCallEventRow,
  type UsageCallRow,
} from "@/lib/agent-calls/types";

const DEFAULT_ABANDONED_MS = 30 * 60 * 1000;
const DEFAULT_ACTIVE_MS = 15 * 60 * 1000;

function sessionKey(restaurantId: string, sessionId: string): string {
  return `${restaurantId}:${sessionId}`;
}

function collectSessionIds(input: DeriveAgentCallSessionsInput): Map<
  string,
  { restaurantId: string; sessionId: string }
> {
  const map = new Map<string, { restaurantId: string; sessionId: string }>();

  const add = (restaurantId: string, sessionId: string | null | undefined) => {
    const sid = sessionId?.trim();
    if (!sid) return;
    const rid = restaurantId.trim();
    if (!rid) return;
    map.set(sessionKey(rid, sid), { restaurantId: rid, sessionId: sid });
  };

  for (const row of input.drafts) {
    add(row.restaurant_id, row.session_id);
  }
  for (const row of input.receipts) {
    add(row.restaurant_id, row.session_id);
  }
  for (const row of input.usageEvents) {
    if (row.restaurant_id) {
      add(row.restaurant_id, row.session_id);
    } else {
      add(input.restaurantId, row.session_id);
    }
  }
  for (const row of input.storedEvents ?? []) {
    add(row.restaurant_id, row.session_id);
  }

  return map;
}

function indexBySession<T extends { session_id: string }>(
  rows: T[]
): Map<string, T> {
  const map = new Map<string, T>();
  for (const row of rows) {
    map.set(row.session_id, row);
  }
  return map;
}

function usageForSession(
  events: UsageCallRow[],
  sessionId: string
): UsageCallRow[] {
  return events.filter((e) => e.session_id?.trim() === sessionId);
}

function maxIso(dates: (string | null | undefined)[]): string | null {
  let best: string | null = null;
  let bestMs = -Infinity;
  for (const iso of dates) {
    if (!iso) continue;
    const ms = new Date(iso).getTime();
    if (Number.isNaN(ms)) continue;
    if (ms > bestMs) {
      bestMs = ms;
      best = iso;
    }
  }
  return best;
}

function minIso(dates: (string | null | undefined)[]): string | null {
  let best: string | null = null;
  let bestMs = Infinity;
  for (const iso of dates) {
    if (!iso) continue;
    const ms = new Date(iso).getTime();
    if (Number.isNaN(ms)) continue;
    if (ms < bestMs) {
      bestMs = ms;
      best = iso;
    }
  }
  return best;
}

function deriveOneSession(
  input: DeriveAgentCallSessionsInput,
  sessionId: string
): AgentCallSession {
  const now = input.now ?? new Date();
  const abandonedAfterMs = input.abandonedAfterMs ?? DEFAULT_ABANDONED_MS;
  const activeWithinMs = input.activeWithinMs ?? DEFAULT_ACTIVE_MS;

  const drafts = indexBySession(input.drafts);
  const receipts = indexBySession(input.receipts);
  const draftRow = drafts.get(sessionId) ?? null;
  const receiptRow = receipts.get(sessionId) ?? null;
  const draft =
    draftRow?.restaurant_id === input.restaurantId ? draftRow : null;
  const receipt =
    receiptRow?.restaurant_id === input.restaurantId ? receiptRow : null;
  const usage = usageForSession(input.usageEvents, sessionId);

  const storedRow = input.storedEvents?.find((row) => row.session_id === sessionId);
  const transcriptMetadata = storedRow?.transcript_metadata ?? {};

  const outcome = classifyAgentCallOutcome({
    draft,
    receipt,
    usage,
    transcriptMetadata,
    now,
    abandonedAfterMs,
  });

  const startedAt =
    minIso([
      draft?.created_at,
      ...usage.map((e) => e.occurred_at),
      receipt?.created_at,
    ]) ?? draft?.created_at ?? usage[0]?.occurred_at ?? now.toISOString();

  const endedAt =
    outcome === "in_progress"
      ? null
      : maxIso([
          receipt?.created_at,
          draft?.completed_at,
          draft?.canceled_at,
          draft?.updated_at,
          ...usage.map((e) => e.occurred_at),
        ]);

  const lastActivityAt = maxIso([
    draft?.updated_at,
    draft?.created_at,
    receipt?.created_at,
    ...usage.map((e) => e.occurred_at),
  ]);

  const status = resolveAgentCallStatus({
    outcome,
    lastActivityAt,
    now,
    activeWithinMs,
  });

  const callerPhone =
    storedRow?.caller_phone?.trim() ||
    draft?.customer_phone?.trim() ||
    receipt?.customer_phone?.trim() ||
    null;

  return {
    restaurantId: input.restaurantId,
    sessionId,
    conversationId: sessionId,
    agentId: input.linkedAgentId?.trim() || null,
    callerPhone,
    status,
    outcome,
    startedAt,
    endedAt,
    transcriptMetadata,
    source: storedRow ? "stored" : "derived",
  };
}

function parseStoredRow(row: StoredCallEventRow): AgentCallSession {
  return {
    restaurantId: row.restaurant_id,
    sessionId: row.session_id,
    conversationId: row.conversation_id,
    agentId: row.agent_id?.trim() || null,
    callerPhone: row.caller_phone?.trim() || null,
    status: row.status === "active" ? "active" : "ended",
    outcome: (AGENT_CALL_OUTCOMES as readonly string[]).includes(row.outcome)
      ? (row.outcome as AgentCallOutcome)
      : "unknown",
    startedAt: row.started_at,
    endedAt: row.ended_at,
    transcriptMetadata: row.transcript_metadata ?? {},
    source: "stored",
  };
}

function mergeStoredOverDerived(
  derived: AgentCallSession,
  stored: AgentCallSession
): AgentCallSession {
  let outcome =
    derived.outcome === "order_completed"
      ? derived.outcome
      : stored.outcome !== "unknown"
        ? stored.outcome
        : derived.outcome;

  outcome = outcomeForVoicemailAwareCall({
    transcriptMetadata: stored.transcriptMetadata,
    receipt:
      derived.outcome === "order_completed"
        ? { session_id: derived.sessionId }
        : null,
    inferredOutcome: outcome,
  }) as AgentCallOutcome;

  if (outcome === "order_completed" && derived.outcome !== "order_completed") {
    outcome = "no_order";
  }

  return {
    ...derived,
    ...stored,
    outcome,
    conversationId: stored.conversationId || derived.conversationId,
    agentId: stored.agentId || derived.agentId,
    callerPhone: stored.callerPhone || derived.callerPhone,
    transcriptMetadata:
      Object.keys(stored.transcriptMetadata).length > 0
        ? stored.transcriptMetadata
        : derived.transcriptMetadata,
    source: "stored",
  };
}

/** Build call sessions from operational tables (no agent_call_events required). */
export function deriveAgentCallSessions(
  input: DeriveAgentCallSessionsInput
): AgentCallSession[] {
  const sessions = collectSessionIds(input);
  const storedBySession = new Map(
    (input.storedEvents ?? []).map((row) => [row.session_id, row])
  );

  const derived: AgentCallSession[] = [];

  for (const { restaurantId, sessionId } of sessions.values()) {
    if (restaurantId !== input.restaurantId) continue;
    const base = deriveOneSession(input, sessionId);
    const storedRow = storedBySession.get(sessionId);
    if (storedRow) {
      derived.push(
        mergeStoredOverDerived(base, parseStoredRow(storedRow))
      );
    } else {
      derived.push(base);
    }
  }

  derived.sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  );

  return derived;
}

export function countActiveDerivedCalls(
  sessions: AgentCallSession[],
  now: Date = new Date(),
  activeWithinMs: number = DEFAULT_ACTIVE_MS
): number {
  return sessions.filter((s) => {
    if (s.status !== "active") return false;
    const last = s.endedAt ?? s.startedAt;
    const ms = new Date(last).getTime();
    return now.getTime() - ms < activeWithinMs;
  }).length;
}

export { lineCountFromItems };
