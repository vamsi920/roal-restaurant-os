import type {
  AgentCallOutcome,
  AgentCallSessionSource,
  AgentCallStatus,
} from "@/lib/agent-calls/types";

export type CallHistoryRow = {
  sessionId: string;
  callerPhone: string | null;
  callerName: string | null;
  intent: CallHistoryIntent;
  intentLabel: string;
  outcome: AgentCallOutcome;
  status: AgentCallStatus;
  outcomeLabel: string;
  ownerActionLabel: string;
  isActionable: boolean;
  lineCount: number;
  /** Formatted total when menu pricing resolves all lines; partial subtotal+ otherwise null. */
  totalLabel: string | null;
  startedAt: string;
  endedAt: string | null;
  occurredAt: string;
  source: AgentCallSessionSource;
  needsStaffFollowUp: boolean;
  followUpReason: string | null;
  transcriptSummary: string | null;
  transcriptLines: CallHistoryTranscriptLine[];
  recordingUrl: string | null;
  durationSeconds: number | null;
  isTestHarness: boolean;
  fulfillmentLabel: string | null;
  callerLanguageLabel: string | null;
};

export type CallHistoryIntent =
  | "active_call"
  | "order"
  | "reservation"
  | "handoff"
  | "voicemail"
  | "faq"
  | "other";

export type CallHistoryTranscriptLine = {
  speaker: "Agent" | "Guest" | "System" | "Tool";
  text: string;
};

export type CallHistorySnapshot = {
  restaurantId: string;
  restaurantName: string;
  rangeSince: string;
  rangeUntil: string;
  rows: CallHistoryRow[];
  reservationRequests: ReservationRequestRow[];
  summary: CallHistorySummary;
  isEmpty: boolean;
};

export type CallHistorySummary = {
  totalCalls: number;
  activeCalls: number;
  completedOrders: number;
  voicemailCalls: number;
  openReservationRequests: number;
  staffFollowUps: number;
  noOrderCalls: number;
  recordingsAvailable: number;
  transcriptsAvailable: number;
  orderConversionPercent: number | null;
};

export type ReservationRequestRow = {
  id: string;
  customerName: string;
  customerPhone: string;
  partySize: number;
  requestedDate: string;
  requestedTime: string;
  notes: string | null;
  status:
    | "requested"
    | "contacted"
    | "confirmed"
    | "declined"
    | "canceled"
    | string;
  sessionId: string | null;
  createdAt: string;
};

export type CallHistoryOutcomeFilter =
  | "all"
  | "completed"
  | "active"
  | "needs_action"
  | "voicemail"
  | "reservations"
  | "failed"
  | "other";
