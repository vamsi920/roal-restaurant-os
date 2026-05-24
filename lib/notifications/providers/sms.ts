import type { NotificationProvider } from "@/lib/notifications/providers/types";

export const smsProvider: NotificationProvider = {
  channel: "sms",

  async send(input) {
    if (input.settings.providerMode === "dev_console") {
      return {
        status: "skipped",
        errorMessage: "SMS disabled in dev console mode.",
      };
    }
    if (!input.settings.channels.sms) {
      return { status: "skipped", errorMessage: "SMS channel off." };
    }
    if (input.settings.smsRecipients.length === 0) {
      return {
        status: "skipped",
        errorMessage: "No SMS recipients configured.",
      };
    }
    return {
      status: "skipped",
      errorMessage:
        "SMS provider not wired yet. Configure Twilio in a follow-up.",
    };
  },
};
