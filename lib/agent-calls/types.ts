export const AGENT_CALL_STATUSES = ["active", "ended"] as const;
export type AgentCallStatus = (typeof AGENT_CALL_STATUSES)[number];

export const AGENT_CALL_OUTCOMES = [
  "in_progress",
  "order_completed",
  "abandoned",
  "canceled",
  "no_order",
  "unknown",
] as const;
export type AgentCallOutcome = (typeof AGENT_CALL_OUTCOMES)[number];

export type AgentCallSessionSource = "derived" | "stored";

/** Unified call view for dashboards (derived and/or persisted). */
export type AgentCallSession = {
  restaurantId: string;
  sessionId: string;
  conversationId: string;
  agentId: string | null;
  callerPhone: string | null;
  status: AgentCallStatus;
  outcome: AgentCallOutcome;
  startedAt: string;
  endedAt: string | null;
  transcriptMetadata: Record<string, unknown>;
  source: AgentCallSessionSource;
};

export type DeriveAgentCallSessionsInput = {
  restaurantId: string;
  linkedAgentId?: string | null;
  drafts: DraftOrderCallRow[];
  receipts: ReceiptCallRow[];
  usageEvents: UsageCallRow[];
  storedEvents?: StoredCallEventRow[];
  now?: Date;
  /** Draft idle time before classifying as abandoned (default 30m). */
  abandonedAfterMs?: number;
  /** Active call window from last activity (default 15m). */
  activeWithinMs?: number;
};

export type DraftOrderCallRow = {
  restaurant_id: string;
  session_id: string;
  status: string;
  items: unknown;
  customer_name: string | null;
  customer_phone: string | null;
  fulfillment_type?: string | null;
  delivery_address?: string | null;
  delivery_instructions?: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  canceled_at: string | null;
};

export type ReceiptCallRow = {
  restaurant_id: string;
  session_id: string;
  customer_name: string | null;
  customer_phone: string | null;
  items: unknown;
  fulfillment_type?: string | null;
  delivery_address?: string | null;
  delivery_instructions?: string | null;
  created_at: string;
};

export type UsageCallRow = {
  event_type: string;
  occurred_at: string;
  restaurant_id: string | null;
  session_id: string | null;
  metadata: Record<string, unknown> | null;
};

export type StoredCallEventRow = {
  restaurant_id: string;
  agent_id: string | null;
  conversation_id: string;
  session_id: string;
  caller_phone: string | null;
  status: string;
  outcome: string;
  started_at: string;
  ended_at: string | null;
  transcript_metadata: Record<string, unknown> | null;
};
