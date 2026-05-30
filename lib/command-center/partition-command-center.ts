import { lineCountFromItems } from "@/lib/agent-calls/classify-outcome";
import type {
  AgentCallSession,
  DraftOrderCallRow,
  UsageCallRow,
} from "@/lib/agent-calls/types";
import type {
  CommandCenterCallRow,
  CommandCenterCompletedOrder,
  CommandCenterCounts,
  RestaurantCommandCenterSnapshot,
} from "@/lib/command-center/types";
export function handoffSignalsFromTranscript(
  metadata: Record<string, unknown>
): string[] {
  const signals: string[] = [];
  if (metadata.handoff_requested === true) signals.push("handoff_requested");
  if (metadata.escalation_requested === true) signals.push("escalation_requested");
  const reason = metadata.handoff_reason ?? metadata.escalation_reason;
  if (typeof reason === "string" && reason.trim()) {
    signals.push(reason.trim());
  }
  const summary =
    typeof metadata.summary === "string"
      ? metadata.summary
      : typeof metadata.transcript_summary === "string"
        ? metadata.transcript_summary
        : "";
  if (/handoff|human|manager|staff|callback/i.test(summary)) {
    signals.push("transcript_mention");
  }
  return signals;
}

export function countSessionToolErrors(
  usageEvents: UsageCallRow[],
  sessionId: string
): number {
  return usageEvents.filter((event) => {
    if (event.session_id?.trim() !== sessionId) return false;
    if (event.event_type !== "tool_call") return false;
    const meta = event.metadata ?? {};
    if (meta.outcome === "error") return true;
    const status = Number(meta.http_status);
    return Number.isFinite(status) && status >= 400;
  }).length;
}

function maxIso(dates: (string | null | undefined)[]): string {
  let best = "";
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

export function draftLineCountBySession(
  drafts: DraftOrderCallRow[]
): Map<string, number> {
  const map = new Map<string, number>();
  for (const draft of drafts) {
    const sessionId = draft.session_id.trim();
    if (!sessionId) continue;
    map.set(sessionId, lineCountFromItems(draft.items));
  }
  return map;
}

export function sessionToCommandCenterCallRow(
  session: AgentCallSession,
  usageEvents: UsageCallRow[],
  draftLineCount = 0
): CommandCenterCallRow {
  const lastActivityAt =
    maxIso([session.endedAt, session.startedAt]) || session.startedAt;

  return {
    sessionId: session.sessionId,
    conversationId: session.conversationId,
    callerPhone: session.callerPhone,
    status: session.status,
    outcome: session.outcome,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    lastActivityAt,
    lineCount: draftLineCount,
    toolErrorCount: countSessionToolErrors(usageEvents, session.sessionId),
    handoffSignals: handoffSignalsFromTranscript(session.transcriptMetadata),
  };
}

export function buildCompletedOrdersFromReceipts(
  receipts: {
    session_id: string;
    customer_name: string | null;
    customer_phone: string | null;
    items: unknown;
    created_at: string;
  }[]
): CommandCenterCompletedOrder[] {
  return receipts
    .map((receipt) => ({
      sessionId: receipt.session_id,
      completedAt: receipt.created_at,
      callerPhone: receipt.customer_phone?.trim() || null,
      customerName: receipt.customer_name?.trim() || null,
      lineCount: lineCountFromItems(receipt.items),
    }))
    .sort(
      (a, b) =>
        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    );
}

export function partitionCommandCenterSessions(input: {
  restaurantId: string;
  restaurantName: string;
  linkedAgentId: string | null;
  rangeSince: string;
  rangeUntil: string;
  sessions: AgentCallSession[];
  usageEvents: UsageCallRow[];
  draftLineCountBySession?: Map<string, number>;
  completedOrders: CommandCenterCompletedOrder[];
  limits?: {
    active?: number;
    failed?: number;
    handoff?: number;
    unknown?: number;
    completed?: number;
  };
}): RestaurantCommandCenterSnapshot {
  const receiptSessionIds = new Set(
    input.completedOrders.map((o) => o.sessionId)
  );

  const activeCalls: CommandCenterCallRow[] = [];
  const failedCalls: CommandCenterCallRow[] = [];
  const handoffCalls: CommandCenterCallRow[] = [];
  const unknownCalls: CommandCenterCallRow[] = [];

  const lineBySession =
    input.draftLineCountBySession ?? new Map<string, number>();

  for (const session of input.sessions) {
    if (receiptSessionIds.has(session.sessionId)) continue;

    const row = sessionToCommandCenterCallRow(
      session,
      input.usageEvents,
      lineBySession.get(session.sessionId) ?? 0
    );

    if (session.status === "active" || session.outcome === "in_progress") {
      activeCalls.push(row);
      continue;
    }

    if (row.handoffSignals.length > 0) {
      handoffCalls.push(row);
      continue;
    }

    const failedOutcome =
      session.outcome === "canceled" ||
      session.outcome === "abandoned" ||
      row.toolErrorCount > 0;

    if (failedOutcome) {
      failedCalls.push(row);
      continue;
    }

    unknownCalls.push(row);
  }

  const lim = input.limits ?? {};
  const slice = <T>(arr: T[], max?: number) =>
    max != null ? arr.slice(0, max) : arr;

  const completedOrders = slice(input.completedOrders, lim.completed);
  const sortByActivity = (a: CommandCenterCallRow, b: CommandCenterCallRow) =>
    new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime();

  const active = slice(activeCalls.sort(sortByActivity), lim.active);
  const failed = slice(failedCalls.sort(sortByActivity), lim.failed);
  const handoff = slice(handoffCalls.sort(sortByActivity), lim.handoff);
  const unknown = slice(unknownCalls.sort(sortByActivity), lim.unknown);

  const counts: CommandCenterCounts = {
    active: active.length,
    completed: completedOrders.length,
    failed: failed.length,
    handoff: handoff.length,
    unknown: unknown.length,
  };

  return {
    restaurantId: input.restaurantId,
    restaurantName: input.restaurantName,
    linkedAgentId: input.linkedAgentId,
    rangeSince: input.rangeSince,
    rangeUntil: input.rangeUntil,
    activeCalls: active,
    completedOrders,
    failedCalls: failed,
    handoffCalls: handoff,
    unknownCalls: unknown,
    counts,
    isEmpty:
      counts.active +
        counts.completed +
        counts.failed +
        counts.handoff +
        counts.unknown ===
      0,
  };
}
