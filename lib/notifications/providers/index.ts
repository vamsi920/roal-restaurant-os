import { devConsoleProvider } from "@/lib/notifications/providers/dev-console";
import { emailProvider } from "@/lib/notifications/providers/email";
import { smsProvider } from "@/lib/notifications/providers/sms";
import { webhookProvider } from "@/lib/notifications/providers/webhook";
import type { NotificationProvider } from "@/lib/notifications/providers/types";
import type {
  NotificationChannelsConfig,
  NotificationSettings,
} from "@/lib/notifications/types";

export const NOTIFICATION_PROVIDERS: NotificationProvider[] = [
  devConsoleProvider,
  emailProvider,
  smsProvider,
  webhookProvider,
];

export function activeProvidersForSettings(
  settings: NotificationSettings
): NotificationProvider[] {
  return NOTIFICATION_PROVIDERS.filter((provider) => {
    const key = provider.channel as keyof NotificationChannelsConfig;
    if (settings.providerMode === "dev_console") {
      return provider.channel === "dev_console";
    }
    return settings.channels[key] === true;
  });
}
