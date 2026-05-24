"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/auth/context-server";
import { isOrgAdmin } from "@/lib/auth/roles";
import {
  channelSecretsForSave,
  loadNotificationSettings,
  NOTIFICATION_EVENT_TYPES,
  saveNotificationSettings,
  type NotificationEventType,
} from "@/lib/notifications";
import type {
  NotificationChannelsConfig,
  NotificationProviderMode,
} from "@/lib/notifications/types";
import { formatSupabaseClientError } from "@/lib/dashboard/format-user-error";
import { createServerSupabase } from "@/lib/supabase/server";

export type SaveNotificationsState = {
  error?: string;
  ok?: boolean;
};

export async function saveNotificationSettingsAction(
  _prev: SaveNotificationsState,
  formData: FormData
): Promise<SaveNotificationsState> {
  const context = await getAuthContext();
  const membership = context?.primaryMembership;
  if (!membership) {
    return { error: "Sign in to manage notifications." };
  }
  if (!isOrgAdmin(membership.role)) {
    return { error: "Only organization admins can change notification settings." };
  }

  const providerMode = formData.get("provider_mode") as NotificationProviderMode;
  if (providerMode !== "dev_console" && providerMode !== "production") {
    return { error: "Invalid provider mode." };
  }

  const enabledEvents = NOTIFICATION_EVENT_TYPES.filter(
    (event) => formData.get(`event_${event}`) === "on"
  ) as NotificationEventType[];

  const channels: NotificationChannelsConfig = {
    dev_console: formData.get("channel_dev_console") === "on",
    email: formData.get("channel_email") === "on",
    sms: formData.get("channel_sms") === "on",
    webhook: formData.get("channel_webhook") === "on",
  };

  if (providerMode === "dev_console") {
    channels.dev_console = true;
    channels.email = false;
    channels.sms = false;
    channels.webhook = false;
  }

  const emailRecipients = String(formData.get("email_recipients") ?? "")
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const smsRecipients = String(formData.get("sms_recipients") ?? "")
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const webhookUrlFromForm =
    String(formData.get("webhook_url") ?? "").trim() || null;
  const stuckRaw = Number(formData.get("order_stuck_minutes"));

  try {
    const supabase = await createServerSupabase();
    const existing = await loadNotificationSettings(
      supabase,
      membership.organization_id
    );

    const secrets = channelSecretsForSave(
      providerMode,
      existing,
      {
        emailRecipients,
        smsRecipients,
        webhookUrl: webhookUrlFromForm,
      }
    );

    const orderStuckMinutes = enabledEvents.includes("order_stuck")
      ? Number.isFinite(stuckRaw)
        ? Math.min(240, Math.max(5, Math.round(stuckRaw)))
        : existing.orderStuckMinutes
      : existing.orderStuckMinutes;

    await saveNotificationSettings(supabase, membership.organization_id, {
      providerMode,
      enabledEvents,
      channels,
      emailRecipients: secrets.emailRecipients,
      smsRecipients: secrets.smsRecipients,
      webhookUrl: secrets.webhookUrl,
      orderStuckMinutes,
    });
    revalidatePath("/dashboard/settings/notifications");
    return { ok: true };
  } catch (e) {
    return {
      error: formatSupabaseClientError(
        e instanceof Error ? e.message : undefined
      ),
    };
  }
}
