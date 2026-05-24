import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  NotificationChannelsConfig,
  NotificationEventType,
  NotificationProviderMode,
  NotificationSettings,
} from "@/lib/notifications/types";
import { NOTIFICATION_EVENT_TYPES } from "@/lib/notifications/types";

type SettingsRow = {
  organization_id: string;
  provider_mode: NotificationProviderMode;
  enabled_events: NotificationEventType[] | null;
  channels: NotificationChannelsConfig | null;
  email_recipients: string[] | null;
  sms_recipients: string[] | null;
  webhook_url: string | null;
  order_stuck_minutes: number;
};

const DEFAULT_CHANNELS: NotificationChannelsConfig = {
  dev_console: true,
  email: false,
  sms: false,
  webhook: false,
};

export function defaultNotificationSettings(
  organizationId: string
): NotificationSettings {
  return {
    organizationId,
    providerMode: "dev_console",
    enabledEvents: [...NOTIFICATION_EVENT_TYPES],
    channels: { ...DEFAULT_CHANNELS },
    emailRecipients: [],
    smsRecipients: [],
    webhookUrl: null,
    orderStuckMinutes: 30,
  };
}

function parseChannels(raw: unknown): NotificationChannelsConfig {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_CHANNELS };
  const o = raw as Record<string, unknown>;
  return {
    dev_console: o.dev_console !== false,
    email: o.email === true,
    sms: o.sms === true,
    webhook: o.webhook === true,
  };
}

export function rowToNotificationSettings(row: SettingsRow): NotificationSettings {
  return {
    organizationId: row.organization_id,
    providerMode: row.provider_mode ?? "dev_console",
    enabledEvents:
      row.enabled_events?.length ? row.enabled_events : [...NOTIFICATION_EVENT_TYPES],
    channels: parseChannels(row.channels),
    emailRecipients: row.email_recipients ?? [],
    smsRecipients: row.sms_recipients ?? [],
    webhookUrl: row.webhook_url?.trim() || null,
    orderStuckMinutes: row.order_stuck_minutes ?? 30,
  };
}

export async function loadNotificationSettings(
  supabase: SupabaseClient,
  organizationId: string
): Promise<NotificationSettings> {
  const { data, error } = await supabase
    .from("notification_settings")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle<SettingsRow>();

  if (error) throw new Error(error.message);
  if (!data) return defaultNotificationSettings(organizationId);
  return rowToNotificationSettings(data);
}

export async function ensureNotificationSettings(
  supabase: SupabaseClient,
  organizationId: string
): Promise<NotificationSettings> {
  const { data, error } = await supabase
    .from("notification_settings")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle<SettingsRow>();

  if (error) throw new Error(error.message);
  if (data) return rowToNotificationSettings(data);

  const defaults = defaultNotificationSettings(organizationId);
  const { error: insertError } = await supabase.from("notification_settings").insert({
    organization_id: organizationId,
    provider_mode: defaults.providerMode,
    enabled_events: defaults.enabledEvents,
    channels: defaults.channels,
  });

  if (insertError) throw new Error(insertError.message);
  return defaults;
}

/** Production-only form fields are omitted when saving dev_console mode. */
export function channelSecretsForSave(
  providerMode: NotificationProviderMode,
  existing: Pick<
    NotificationSettings,
    "emailRecipients" | "smsRecipients" | "webhookUrl"
  >,
  fromForm: Pick<
    NotificationSettings,
    "emailRecipients" | "smsRecipients" | "webhookUrl"
  >
): Pick<NotificationSettings, "emailRecipients" | "smsRecipients" | "webhookUrl"> {
  if (providerMode === "dev_console") {
    return {
      emailRecipients: existing.emailRecipients,
      smsRecipients: existing.smsRecipients,
      webhookUrl: existing.webhookUrl,
    };
  }
  return fromForm;
}

export type SaveNotificationSettingsInput = {
  providerMode: NotificationProviderMode;
  enabledEvents: NotificationEventType[];
  channels: NotificationChannelsConfig;
  emailRecipients: string[];
  smsRecipients: string[];
  webhookUrl: string | null;
  orderStuckMinutes: number;
};

export async function saveNotificationSettings(
  supabase: SupabaseClient,
  organizationId: string,
  input: SaveNotificationSettingsInput
): Promise<NotificationSettings> {
  const { data, error } = await supabase
    .from("notification_settings")
    .upsert(
      {
        organization_id: organizationId,
        provider_mode: input.providerMode,
        enabled_events: input.enabledEvents,
        channels: input.channels,
        email_recipients: input.emailRecipients,
        sms_recipients: input.smsRecipients,
        webhook_url: input.webhookUrl,
        order_stuck_minutes: input.orderStuckMinutes,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id" }
    )
    .select("*")
    .single<SettingsRow>();

  if (error) throw new Error(error.message);
  return rowToNotificationSettings(data);
}
