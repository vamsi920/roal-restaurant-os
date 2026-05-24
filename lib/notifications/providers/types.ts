import type {
  NotificationChannel,
  NotificationSettings,
  NotificationEventType,
} from "@/lib/notifications/types";

export type ProviderSendInput = {
  settings: NotificationSettings;
  organizationId: string;
  restaurantId: string | null;
  eventType: NotificationEventType;
  title: string;
  body: string;
  payload: Record<string, unknown>;
};

export type ProviderSendResult = {
  status: "sent" | "failed" | "skipped";
  errorMessage?: string;
  detail?: string;
};

export type NotificationProvider = {
  channel: NotificationChannel;
  send: (input: ProviderSendInput) => Promise<ProviderSendResult>;
};
