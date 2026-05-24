import type { NotificationProvider } from "@/lib/notifications/providers/types";

export const webhookProvider: NotificationProvider = {
  channel: "webhook",

  async send(input) {
    if (input.settings.providerMode === "dev_console") {
      return {
        status: "skipped",
        errorMessage: "Webhook disabled in dev console mode.",
      };
    }
    if (!input.settings.channels.webhook) {
      return { status: "skipped", errorMessage: "Webhook channel off." };
    }
    const url = input.settings.webhookUrl?.trim();
    if (!url) {
      return {
        status: "skipped",
        errorMessage: "No webhook URL configured.",
      };
    }

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "ROAL-Notifications/1.0",
        },
        body: JSON.stringify({
          event: input.eventType,
          title: input.title,
          body: input.body,
          organization_id: input.organizationId,
          restaurant_id: input.restaurantId,
          payload: input.payload,
          occurred_at: new Date().toISOString(),
        }),
        signal: AbortSignal.timeout(10_000),
      });

      if (!res.ok) {
        return {
          status: "failed",
          errorMessage: `Webhook returned ${res.status}`,
        };
      }

      return { status: "sent", detail: "Webhook accepted." };
    } catch (e) {
      return {
        status: "failed",
        errorMessage: e instanceof Error ? e.message : "Webhook request failed",
      };
    }
  },
};
