import type { SupabaseClient } from "@supabase/supabase-js";
import { activeProvidersForSettings } from "@/lib/notifications/providers";
import { loadNotificationSettings } from "@/lib/notifications/settings";
import type { ProviderSendResult } from "@/lib/notifications/providers/types";
import type { DispatchNotificationInput } from "@/lib/notifications/types";

function deliveryLogErrorMessage(result: ProviderSendResult): string | null {
  if (result.status === "sent") return null;
  return result.errorMessage ?? null;
}

export async function dispatchNotification(
  supabase: SupabaseClient,
  input: DispatchNotificationInput
): Promise<boolean> {
  const settings = await loadNotificationSettings(supabase, input.organizationId);

  if (!settings.enabledEvents.includes(input.eventType)) {
    return false;
  }

  const providers = activeProvidersForSettings(settings);
  const payload = {
    ...input.payload,
    restaurant_name: input.restaurantName ?? undefined,
  };

  let delivered = false;

  for (const provider of providers) {
    const result = await provider.send({
      settings,
      organizationId: input.organizationId,
      restaurantId: input.restaurantId ?? null,
      eventType: input.eventType,
      title: input.title,
      body: input.body,
      payload,
    });

    const idempotencyKey = input.idempotencyKey
      ? `${input.idempotencyKey}:${provider.channel}`
      : null;

    const { error } = await supabase.from("notification_deliveries").insert({
      organization_id: input.organizationId,
      restaurant_id: input.restaurantId ?? null,
      event_type: input.eventType,
      channel: provider.channel,
      title: input.title,
      body: input.body,
      payload,
      status: result.status,
      error_message: deliveryLogErrorMessage(result),
      idempotency_key: idempotencyKey,
    });

    if (error?.code === "23505") {
      continue;
    }
    if (error) {
      console.error(
        "[notifications] delivery log failed",
        input.eventType,
        provider.channel,
        error.message
      );
      continue;
    }
    delivered = true;
  }

  return delivered;
}
