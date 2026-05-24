import type { NotificationProvider } from "@/lib/notifications/providers/types";

/** Logs notifications server-side and records delivery rows (via dispatch). */
export const devConsoleProvider: NotificationProvider = {
  channel: "dev_console",

  async send(input) {
    const prefix = `[ROAL notify:${input.eventType}]`;
    console.info(prefix, input.title, {
      organizationId: input.organizationId,
      restaurantId: input.restaurantId,
      body: input.body,
      payload: input.payload,
    });
    return {
      status: "sent",
      detail: "Logged to server console and notification delivery log.",
    };
  },
};
