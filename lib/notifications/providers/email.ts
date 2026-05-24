import type { NotificationProvider } from "@/lib/notifications/providers/types";

export const emailProvider: NotificationProvider = {
  channel: "email",

  async send(input) {
    if (input.settings.providerMode === "dev_console") {
      return {
        status: "skipped",
        errorMessage: "Email disabled in dev console mode.",
      };
    }
    if (!input.settings.channels.email) {
      return { status: "skipped", errorMessage: "Email channel off." };
    }
    if (input.settings.emailRecipients.length === 0) {
      return {
        status: "skipped",
        errorMessage: "No email recipients configured.",
      };
    }
    return {
      status: "skipped",
      errorMessage:
        "Email provider not wired yet. Configure SendGrid/Resend in a follow-up.",
    };
  },
};
