export const USAGE_EVENT_TYPES = [
  "menu_scan",
  "import_attempt",
  "tool_call",
  "voice_order",
  "order_completed",
  "active_location",
] as const;

export type UsageEventType = (typeof USAGE_EVENT_TYPES)[number];

export type UsageEventScope = {
  organizationId: string;
  restaurantId?: string | null;
  userId?: string | null;
  sessionId?: string | null;
};

export type RecordUsageEventInput = UsageEventScope & {
  eventType: UsageEventType;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string | null;
  occurredAt?: string;
};

export type UsageMenuScanMetadata = {
  import_id: string;
  outcome: "extracted" | "extraction_failed";
  category_count?: number;
  item_count?: number;
  model_used?: string;
  error_code?: string;
};

export type UsageImportAttemptMetadata = {
  import_id: string;
  outcome: "uploaded" | "committed" | "commit_failed" | "discarded";
  category_count?: number;
  item_count?: number;
  modifier_count?: number;
  error_code?: string;
};

export type UsageToolCallMetadata = {
  tool:
    | "get_menu_items"
    | "get_restaurant_info"
    | "get_caller_history"
    | "submit_reservation_request"
    | "sync_draft_order"
    | "finalize_order"
    | "get_order_status";
  http_status: number;
  outcome: "success" | "error";
  line_count?: number;
  idempotent_replay?: boolean;
};

export type UsageVoiceOrderMetadata = {
  session_id: string;
  line_count: number;
  status: string;
};

export type UsageOrderCompletedMetadata = {
  session_id: string;
  line_count: number;
  order_status: string;
};
