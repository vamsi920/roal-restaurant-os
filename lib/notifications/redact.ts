import type { NotificationDeliveryRow, NotificationSettings } from "@/lib/notifications/types";

const URL_PATTERN = /https?:\/\/[^\s]+/gi;

/** Hide channel secrets from members who cannot edit settings. */
export function notificationSettingsForViewer(
  settings: NotificationSettings,
  canEdit: boolean
): NotificationSettings {
  if (canEdit) return settings;
  return {
    ...settings,
    webhookUrl: null,
    emailRecipients: [],
    smsRecipients: [],
  };
}

export function redactDeliveryErrorMessage(message: string | null): string | null {
  if (!message) return null;
  return message.replace(URL_PATTERN, "[redacted-url]");
}

export function deliveryRowForClient(
  row: NotificationDeliveryRow
): NotificationDeliveryRow {
  return {
    ...row,
    payload: null,
    error_message: redactDeliveryErrorMessage(row.error_message),
  };
}
