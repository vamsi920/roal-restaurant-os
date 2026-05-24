export const NOTIFICATION_EVENT_TYPES = [
  "order_completed",
  "sync_failure",
  "scan_failure",
  "order_stuck",
  "realtime_degraded",
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
  realtime_degraded: "Realtime connection degraded",
};

export const NOTIFICATION_EVENT_DESCRIPTIONS: Record<
  NotificationEventType,
  string
> = {
  order_completed: "When a phone order is marked complete on the KDS.",
  sync_failure: "When ElevenLabs tool or profile sync fails for a location.",
  scan_failure: "When menu photo extraction fails.",
  order_stuck: "When an order stays in the kitchen queue past your threshold.",
  realtime_degraded:
    "When the live orders panel falls back to polling (Realtime offline).",
};
