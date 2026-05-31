import { lineCountFromItems } from "@/lib/agent-calls/classify-outcome";
import type {
  AgentCallOutcome,
  AgentCallSession,
  DraftOrderCallRow,
  ReceiptCallRow,
} from "@/lib/agent-calls/types";
import type {
  CallHistoryOutcomeFilter,
  CallHistoryRow,
  CallHistorySummary,
  CallHistoryTranscriptLine,
  CallHistoryIntent,
} from "@/lib/call-history/types";
import { computeOrderTotals } from "@/lib/orders/compute-order-totals";
import { parseOrderLineItems } from "@/lib/orders/line-items";
import type { MenuPriceContext } from "@/lib/orders/menu-price-context";
import { formatMoney } from "@/lib/orders/money";
import type { OrderPricingSettings } from "@/lib/orders/pricing-settings";
import { DEFAULT_ORDER_PRICING } from "@/lib/orders/pricing-settings";

const OUTCOME_LABEL: Record<AgentCallOutcome, string> = {
  in_progress: "In progress",
  order_completed: "Order completed",
  abandoned: "Abandoned",
  canceled: "Canceled",
  no_order: "No order",
  unknown: "Unknown",
};

const INTENT_LABEL: Record<CallHistoryIntent, string> = {
  active_call: "Live call",
  order: "Order",
  reservation: "Reservation",
  handoff: "Staff handoff",
  voicemail: "Voicemail",
  faq: "Menu or info",
  other: "Other",
};

const FOLLOW_UP_KEYS = [
  "voicemail_detected",
  "voicemail",
  "left_voicemail",
  "message_left",
  "handoff_requested",
  "handoff_required",
  "manager_requested",
  "callback_requested",
  "escalation_requested",
] as const;

const FOLLOW_UP_LABELS: Record<(typeof FOLLOW_UP_KEYS)[number], string> = {
  voicemail_detected: "Voicemail left",
  voicemail: "Voicemail left",
  left_voicemail: "Voicemail left",
  message_left: "Voicemail left",
  handoff_requested: "Staff handoff",
  handoff_required: "Staff handoff",
  manager_requested: "Manager requested",
  callback_requested: "Callback requested",
  escalation_requested: "Escalation requested",
};

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asFiniteNumber(value: unknown): number | null {
  const num =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : NaN;
  return Number.isFinite(num) ? num : null;
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

function isTruthyFlag(value: unknown): boolean {
  return value === true || asString(value).toLowerCase() === "true";
}

function transcriptBlob(metadata: Record<string, unknown>): string {
  const pieces = [
    metadata.transcript_summary,
    metadata.summary,
    metadata.intent,
    metadata.call_intent,
    metadata.call_type,
    metadata.outcome,
    metadata.follow_up_reason,
    metadata.followup_reason,
  ];

  const analysis = metadata.analysis;
  if (analysis && typeof analysis === "object" && !Array.isArray(analysis)) {
    const row = analysis as Record<string, unknown>;
    pieces.push(row.transcript_summary, row.call_successful);
  }

  const transcript = metadata.transcript;
  if (Array.isArray(transcript)) {
    for (const turn of transcript.slice(0, 24)) {
      if (!turn || typeof turn !== "object" || Array.isArray(turn)) continue;
      const row = turn as Record<string, unknown>;
      pieces.push(row.message, row.text, row.content, row.transcript);
    }
  }

  return pieces.map(asString).filter(Boolean).join(" ").toLowerCase();
}

function metadataLooksLikeVoicemail(metadata: Record<string, unknown>): boolean {
  const blob = transcriptBlob(metadata);
  return (
    blob.includes("voicemail") ||
    blob.includes("voice mail") ||
    blob.includes("left a message") ||
    blob.includes("leave a message") ||
    blob.includes("message for the restaurant") ||
    blob.includes("call me back")
  );
}

function inferCallIntent(input: {
  outcome: AgentCallOutcome;
  status: string;
  lineCount: number;
  hasReservationRequest: boolean;
  followUpReason: string | null;
  metadata: Record<string, unknown>;
}): CallHistoryIntent {
  if (input.status === "active" || input.outcome === "in_progress") {
    return "active_call";
  }
  if (input.followUpReason === "Voicemail left" || metadataLooksLikeVoicemail(input.metadata)) {
    return "voicemail";
  }
  if (input.followUpReason) return "handoff";
  if (input.hasReservationRequest) return "reservation";
  if (input.outcome === "order_completed" || input.lineCount > 0) return "order";

  const blob = transcriptBlob(input.metadata);
  if (
    blob.includes("reservation") ||
    blob.includes("book a table") ||
    blob.includes("party of") ||
    blob.includes("table for")
  ) {
    return "reservation";
  }
  if (
    blob.includes("hours") ||
    blob.includes("open") ||
    blob.includes("close") ||
    blob.includes("directions") ||
    blob.includes("address") ||
    blob.includes("allergen") ||
    blob.includes("allergy") ||
    blob.includes("menu") ||
    blob.includes("wait time")
  ) {
    return "faq";
  }

  return "other";
}

function ownerActionFor(input: {
  intent: CallHistoryIntent;
  outcome: AgentCallOutcome;
  followUpReason: string | null;
  hasReservationRequest: boolean;
}): { label: string; actionable: boolean } {
  if (input.intent === "active_call") {
    return { label: "Watch live order screen", actionable: true };
  }
  if (input.intent === "voicemail") {
    return { label: "Call guest back", actionable: true };
  }
  if (input.followUpReason) {
    return { label: input.followUpReason, actionable: true };
  }
  if (input.hasReservationRequest || input.intent === "reservation") {
    return { label: "Confirm table with guest", actionable: true };
  }
  if (input.outcome === "order_completed") {
    return { label: "Prepare kitchen ticket", actionable: false };
  }
  if (input.outcome === "abandoned") {
    return { label: "Review abandoned call", actionable: true };
  }
  if (input.intent === "faq") {
    return { label: "Answered from restaurant info", actionable: false };
  }
  return { label: "No action needed", actionable: false };
}

export function followUpReasonFromTranscriptMetadata(
  metadata: Record<string, unknown>
): string | null {
  for (const key of FOLLOW_UP_KEYS) {
    if (isTruthyFlag(metadata[key])) return FOLLOW_UP_LABELS[key];
  }
  if (metadataLooksLikeVoicemail(metadata)) return "Voicemail left";
  return null;
}

export function recordingUrlFromTranscriptMetadata(
  metadata: Record<string, unknown>
): string | null {
  return safeHttpUrl(metadata.recording_url) ?? safeHttpUrl(metadata.audio_url);
}

function normalizeSpeaker(value: unknown): CallHistoryTranscriptLine["speaker"] {
  const role = asString(value).toLowerCase();
  if (role.includes("agent") || role.includes("assistant")) return "Agent";
  if (role.includes("user") || role.includes("customer") || role.includes("guest")) {
    return "Guest";
  }
  if (role.includes("tool")) return "Tool";
  return "System";
}

export function transcriptLinesFromMetadata(
  metadata: Record<string, unknown>,
  limit = 12
): CallHistoryTranscriptLine[] {
  const transcript = metadata.transcript;
  if (!Array.isArray(transcript)) return [];

  const lines: CallHistoryTranscriptLine[] = [];
  for (const raw of transcript) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const row = raw as Record<string, unknown>;
    const text =
      asString(row.message) ||
      asString(row.text) ||
      asString(row.content) ||
      asString(row.transcript);
    if (!text) continue;
    lines.push({
      speaker: normalizeSpeaker(row.role ?? row.speaker ?? row.type),
      text,
    });
    if (lines.length >= limit) break;
  }

  return lines;
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

export function formatCallHistoryTotal(
  items: unknown,
  menuCtx: MenuPriceContext | null,
  pricing: OrderPricingSettings = DEFAULT_ORDER_PRICING
): string | null {
  const lines = parseOrderLineItems(items);
  if (lines.length === 0) return null;
  if (!menuCtx) return null;

  const totals = computeOrderTotals(lines, menuCtx, pricing);
  if (totals.complete && totals.total != null) {
    return formatMoney(totals.total);
  }
  if (totals.subtotal != null) {
    return `${formatMoney(totals.subtotal)}+`;
  }
  return null;
}

export function buildCallHistoryRows(input: {
  sessions: AgentCallSession[];
  drafts: DraftOrderCallRow[];
  receipts: ReceiptCallRow[];
  reservationSessionIds?: Iterable<string | null | undefined>;
  menuCtx?: MenuPriceContext | null;
  pricing?: OrderPricingSettings;
  limit?: number;
}): CallHistoryRow[] {
  const drafts = indexBySession(input.drafts);
  const receipts = indexBySession(input.receipts);
  const reservationSessionIds = new Set(
    [...(input.reservationSessionIds ?? [])]
      .map((id) => id?.trim())
      .filter((id): id is string => Boolean(id))
  );
  const pricing = input.pricing ?? DEFAULT_ORDER_PRICING;
  const limit = input.limit ?? 100;

  const rows: CallHistoryRow[] = input.sessions.map((session) => {
    const draft = drafts.get(session.sessionId) ?? null;
    const receipt = receipts.get(session.sessionId) ?? null;
    const items = receipt?.items ?? draft?.items ?? [];
    const lineCount = lineCountFromItems(items);
    const totalLabel = input.menuCtx
      ? formatCallHistoryTotal(items, input.menuCtx, pricing)
      : null;

    const callerName =
      draft?.customer_name?.trim() || receipt?.customer_name?.trim() || null;
    const callerPhone =
      session.callerPhone?.trim() ||
      draft?.customer_phone?.trim() ||
      receipt?.customer_phone?.trim() ||
      null;

    const occurredAt = session.endedAt ?? session.startedAt;
    const followUpReason = followUpReasonFromTranscriptMetadata(
      session.transcriptMetadata
    );
    const hasReservationRequest = reservationSessionIds.has(session.sessionId);
    const intent = inferCallIntent({
      outcome: session.outcome,
      status: session.status,
      lineCount,
      hasReservationRequest,
      followUpReason,
      metadata: session.transcriptMetadata,
    });
    const ownerAction = ownerActionFor({
      intent,
      outcome: session.outcome,
      followUpReason,
      hasReservationRequest,
    });
    const transcriptSummary =
      asString(session.transcriptMetadata.transcript_summary) ||
      asString(session.transcriptMetadata.summary) ||
      null;
    const durationSeconds = asFiniteNumber(
      session.transcriptMetadata.call_duration_secs
    );

    return {
      sessionId: session.sessionId,
      callerPhone,
      callerName,
      intent,
      intentLabel: INTENT_LABEL[intent],
      outcome: session.outcome,
      status: session.status,
      outcomeLabel: OUTCOME_LABEL[session.outcome],
      ownerActionLabel: ownerAction.label,
      isActionable: ownerAction.actionable,
      lineCount,
      totalLabel,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      occurredAt,
      source: session.source,
      needsStaffFollowUp: followUpReason != null,
      followUpReason,
      transcriptSummary,
      transcriptLines: transcriptLinesFromMetadata(session.transcriptMetadata),
      recordingUrl: recordingUrlFromTranscriptMetadata(session.transcriptMetadata),
      durationSeconds,
    };
  });

  rows.sort(
    (a, b) =>
      new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
  );

  return rows.slice(0, limit);
}

export function buildCallHistorySummary(input: {
  rows: CallHistoryRow[];
  openReservationRequests: number;
}): CallHistorySummary {
  const totalCalls = input.rows.length;
  const completedOrders = input.rows.filter((row) => row.outcome === "order_completed").length;
  const endedCalls = input.rows.filter((row) => row.status !== "active").length;
  const voicemailCalls = input.rows.filter((row) => row.intent === "voicemail").length;

  return {
    totalCalls,
    activeCalls: input.rows.filter((row) => row.status === "active").length,
    completedOrders,
    voicemailCalls,
    openReservationRequests: input.openReservationRequests,
    staffFollowUps: input.rows.filter((row) => row.needsStaffFollowUp || row.isActionable).length,
    noOrderCalls: input.rows.filter((row) => row.outcome === "no_order").length,
    recordingsAvailable: input.rows.filter((row) => row.recordingUrl != null).length,
    transcriptsAvailable: input.rows.filter(
      (row) => row.transcriptSummary != null || row.transcriptLines.length > 0
    ).length,
    orderConversionPercent:
      endedCalls > 0 ? Math.round((completedOrders / endedCalls) * 100) : null,
  };
}

export function filterCallHistoryRows(
  rows: CallHistoryRow[],
  filter: CallHistoryOutcomeFilter
): CallHistoryRow[] {
  if (filter === "all") return rows;
  return rows.filter((row) => {
    switch (filter) {
      case "completed":
        return row.outcome === "order_completed";
      case "active":
        return row.outcome === "in_progress" || row.status === "active";
      case "needs_action":
        return row.isActionable || row.needsStaffFollowUp;
      case "voicemail":
        return row.intent === "voicemail";
      case "reservations":
        return row.intent === "reservation";
      case "failed":
        return row.outcome === "canceled" || row.outcome === "abandoned";
      case "other":
        return (
          row.outcome !== "order_completed" &&
          row.outcome !== "in_progress" &&
          row.status !== "active" &&
          row.outcome !== "canceled" &&
          row.outcome !== "abandoned"
        );
      default:
        return true;
    }
  });
}
