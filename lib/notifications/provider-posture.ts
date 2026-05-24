/** Launch posture for notification channels (prompt 22). */
export const NOTIFICATION_PROVIDER_POSTURE = {
  devDefault:
    "Dev console mode is on by default — alerts log to the server and appear in Recent deliveries below.",
  emailSmsHumanOnly:
    "Email and SMS are not wired for self-serve yet. Production mode can record recipients, but delivery stays skipped until SendGrid/Resend (email) or Twilio (SMS) is configured by ROAL ops.",
  webhookLive:
    "Webhooks POST JSON in production mode when a URL is saved and the channel is enabled.",
  memberReadOnly:
    "Organization members can view delivery history. Only admins can change settings or channel secrets.",
} as const;
