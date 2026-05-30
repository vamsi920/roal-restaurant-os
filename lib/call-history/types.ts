import type {
  AgentCallOutcome,
  AgentCallSessionSource,
  AgentCallStatus,
} from "@/lib/agent-calls/types";

export type CallHistoryRow = {
  sessionId: string;
  callerPhone: string | null;
  callerName: string | null;
  outcome: AgentCallOutcome;
  status: AgentCallStatus;
  outcomeLabel: string;
  lineCount: number;
  /** Formatted total when menu pricing resolves all lines; partial subtotal+ otherwise null. */
  totalLabel: string | null;
  startedAt: string;
  endedAt: string | null;
  occurredAt: string;
  source: AgentCallSessionSource;
};

export type CallHistorySnapshot = {
  restaurantId: string;
  restaurantName: string;
  rangeSince: string;
  rangeUntil: string;
  rows: CallHistoryRow[];
  isEmpty: boolean;
};

export type CallHistoryOutcomeFilter =
  | "all"
  | "completed"
  | "active"
  | "failed"
  | "other";
