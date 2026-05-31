export const NOTIFICATION_EVENT_TYPES = [
  "order_completed",
  "sync_failure",
  "scan_failure",
  "order_stuck",
  "provision_failure",
  "menu_auto_sync_failure",
  "go_live",
  "realtime_degraded",
  "staff_handoff_requested",
  "voicemail_callback",
  "reservation_request",
  "catering_inquiry",
  "complaint_caller",
  "call_review_needed",
  "stuck_active_call",
] as const;

export type NotificationEventType = (typeof NOTIFICATION_EVENT_TYPES)[number];

export type NotificationChannel =
  | "dev_console"
  | "email"
  | "sms"
  | "webhook";

export type NotificationProviderMode = "dev_console" | "production";

export type NotificationChannelsConfig = {
  dev_console: boolean;
  email: boolean;
  sms: boolean;
  webhook: boolean;
};

export type NotificationSettings = {
  organizationId: string;
  providerMode: NotificationProviderMode;
  enabledEvents: NotificationEventType[];
  channels: NotificationChannelsConfig;
  emailRecipients: string[];
  smsRecipients: string[];
  webhookUrl: string | null;
  orderStuckMinutes: number;
};

export type NotificationDeliveryRow = {
  id: string;
  organization_id: string;
  restaurant_id: string | null;
  event_type: NotificationEventType;
  channel: string;
  title: string;
  body: string;
  payload: Record<string, unknown> | null;
  status: "sent" | "failed" | "skipped";
  error_message: string | null;
  created_at: string;
};

export type DispatchNotificationInput = {
  organizationId: string;
  restaurantId?: string | null;
  restaurantName?: string | null;
  eventType: NotificationEventType;
  title: string;
  body: string;
  payload?: Record<string, unknown>;
  idempotencyKey?: string;
};

export const NOTIFICATION_EVENT_LABELS: Record<NotificationEventType, string> = {
  order_completed: "Order completed",
  sync_failure: "Voice agent sync failure",
  scan_failure: "Menu scan failure",
  order_stuck: "Order stuck in kitchen",
  provision_failure: "Voice agent provisioning failure",
  menu_auto_sync_failure: "Menu auto-sync failure",
  go_live: "Location went live",
  realtime_degraded: "Realtime connection degraded",
  staff_handoff_requested: "Staff handoff requested",
  voicemail_callback: "Voicemail / callback",
  reservation_request: "Reservation request",
  catering_inquiry: "Catering inquiry",
  complaint_caller: "Complaint / unhappy caller",
  call_review_needed: "Call needs review",
  stuck_active_call: "Stuck live call",
};

export const NOTIFICATION_EVENT_DESCRIPTIONS: Record<
  NotificationEventType,
  string
> = {
  order_completed: "When a phone order is marked complete on the KDS.",
  sync_failure: "When ElevenLabs tool or profile sync fails for a location.",
  scan_failure: "When menu photo extraction fails.",
  order_stuck: "When an order stays in the kitchen queue past your threshold.",
  provision_failure:
    "When dedicated voice agent auto-setup fails for a location (once per failure).",
  menu_auto_sync_failure:
    "When menu or profile changes fail to sync to the voice agent (once per failure).",
  go_live: "When a location completes onboarding and goes live.",
  realtime_degraded:
    "When the live orders panel falls back to polling (Realtime offline).",
  staff_handoff_requested:
    "When a phone call asks for manager/staff follow-up or escalation.",
  voicemail_callback:
    "When a caller leaves voicemail or asks for a callback number follow-up.",
  reservation_request:
    "When the agent saves a table reservation request that still needs staff confirmation.",
  catering_inquiry:
    "When a caller asks about catering or large-party orders.",
  complaint_caller:
    "When a caller is unhappy and needs owner or manager follow-up.",
  call_review_needed:
    "When a call fails or ends without an order and needs owner review.",
  stuck_active_call:
    "When a live inbound call stays active past your threshold.",
};
