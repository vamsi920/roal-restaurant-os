"use client";

import { useFormState } from "react-dom";
import {
  NOTIFICATION_EVENT_DESCRIPTIONS,
  NOTIFICATION_EVENT_LABELS,
  NOTIFICATION_EVENT_TYPES,
} from "@/lib/notifications/types";
import type { NotificationSettings } from "@/lib/notifications/types";
import { cn } from "@/lib/cn";
import { NOTIFICATION_PROVIDER_POSTURE } from "@/lib/notifications/provider-posture";
import {
  saveNotificationSettingsAction,
  type SaveNotificationsState,
} from "@/app/dashboard/settings/notifications/actions";

type Props = {
  settings: NotificationSettings;
  canEdit: boolean;
};

const initial: SaveNotificationsState = {};

export function NotificationSettingsForm({ settings, canEdit }: Props) {
  const [state, action] = useFormState(saveNotificationSettingsAction, initial);
  const production = settings.providerMode === "production";

  return (
    <form action={action} className="notification-settings min-w-0 space-y-6 sm:space-y-8">
      <section className="notification-settings__mode dashboard-panel min-w-0">
        <h2 className="dashboard-page__section-title">Delivery mode</h2>
        <p className="mt-1 text-xs text-muted">
          Dev console logs to the server and delivery history below. Production
          enables webhook delivery; email and SMS stay human-setup until
          providers are wired.
        </p>
        <div className="notification-settings__mode-options mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
          <label className="notification-settings__radio flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-line bg-elev px-3 text-sm sm:min-h-10 sm:border-transparent sm:bg-transparent sm:px-0">
            <input
              type="radio"
              name="provider_mode"
              value="dev_console"
              defaultChecked={settings.providerMode === "dev_console"}
              disabled={!canEdit}
              className="h-4 w-4 shrink-0"
            />
            Development console
          </label>
          <label className="notification-settings__radio flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-line bg-elev px-3 text-sm sm:min-h-10 sm:border-transparent sm:bg-transparent sm:px-0">
            <input
              type="radio"
              name="provider_mode"
              value="production"
              defaultChecked={settings.providerMode === "production"}
              disabled={!canEdit}
              className="h-4 w-4 shrink-0"
            />
            Production channels
          </label>
        </div>
      </section>

      <section className="notification-settings__events dashboard-panel min-w-0">
        <h2 className="dashboard-page__section-title">Events</h2>
        <ul className="mt-4 space-y-3">
          {NOTIFICATION_EVENT_TYPES.map((event) => (
            <li
              key={event}
              className="notification-settings__event flex gap-3 rounded-lg border border-line bg-elev px-3 py-2.5"
            >
              <input
                type="checkbox"
                name={`event_${event}`}
                defaultChecked={settings.enabledEvents.includes(event)}
                disabled={!canEdit}
                className="mt-1 h-4 w-4 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink">
                  {NOTIFICATION_EVENT_LABELS[event]}
                </p>
                <p className="text-xs text-muted [overflow-wrap:anywhere]">
                  {NOTIFICATION_EVENT_DESCRIPTIONS[event]}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-4">
          <label className="dashboard-page__kicker mb-1.5 block">
            Stuck order threshold (minutes)
          </label>
          <input
            type="number"
            name="order_stuck_minutes"
            min={5}
            max={240}
            defaultValue={settings.orderStuckMinutes}
            disabled={!canEdit}
            className="input-base min-h-11 w-full max-w-[8rem] sm:min-h-10"
          />
          <p className="mt-1 text-xs text-muted">
            Applies when &ldquo;Order stuck in kitchen&rdquo; is enabled above.
          </p>
        </div>
      </section>

      <section
        className={cn(
          "notification-settings__channels dashboard-panel min-w-0",
          !production && "opacity-60"
        )}
      >
        <h2 className="dashboard-page__section-title">Channels</h2>
        <p className="mt-1 text-xs text-muted">
          {NOTIFICATION_PROVIDER_POSTURE.emailSmsHumanOnly}
        </p>
        {production ? (
          <p className="mt-2 rounded-lg border border-line bg-elev px-3 py-2 text-xs text-muted">
            {NOTIFICATION_PROVIDER_POSTURE.webhookLive}
          </p>
        ) : null}
        <ul className="mt-4 space-y-2 text-sm">
          <ChannelToggle
            name="channel_dev_console"
            label="Dev console"
            checked={settings.channels.dev_console}
            disabled={!canEdit || production}
          />
          <ChannelToggle
            name="channel_email"
            label="Email"
            checked={settings.channels.email}
            disabled={!canEdit || !production}
          />
          <ChannelToggle
            name="channel_sms"
            label="SMS"
            checked={settings.channels.sms}
            disabled={!canEdit || !production}
          />
          <ChannelToggle
            name="channel_webhook"
            label="Webhook"
            checked={settings.channels.webhook}
            disabled={!canEdit || !production}
          />
        </ul>

        <div className="mt-4 space-y-4">
          <div>
            <label className="dashboard-page__kicker mb-1.5 block">
              Email recipients
            </label>
            <textarea
              name="email_recipients"
              rows={2}
              defaultValue={settings.emailRecipients.join(", ")}
              disabled={!canEdit || !production}
              placeholder="ops@example.com, owner@example.com"
              className="input-base min-h-[4rem] w-full min-w-0 resize-y"
            />
          </div>
          <div>
            <label className="dashboard-page__kicker mb-1.5 block">
              SMS numbers
            </label>
            <textarea
              name="sms_recipients"
              rows={2}
              defaultValue={settings.smsRecipients.join(", ")}
              disabled={!canEdit || !production}
              placeholder="+15551234567"
              className="input-base min-h-[4rem] w-full min-w-0 resize-y"
            />
          </div>
          <div>
            <label className="dashboard-page__kicker mb-1.5 block">
              Webhook URL
            </label>
            <input
              type="url"
              name="webhook_url"
              defaultValue={settings.webhookUrl ?? ""}
              disabled={!canEdit || !production}
              placeholder="https://hooks.example.com/roal"
              className="input-base min-h-11 w-full min-w-0 sm:min-h-10"
            />
          </div>
        </div>
      </section>

      {state.error ? (
        <p
          className="notification-settings__error text-sm text-danger [overflow-wrap:anywhere]"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p className="text-sm text-success" role="status">
          Settings saved.
        </p>
      ) : null}

      {canEdit ? (
        <button
          type="submit"
          className="notification-settings__submit btn-primary kds-thumb-btn min-h-11 w-full sm:w-auto"
        >
          Save notification settings
        </button>
      ) : (
        <p className="text-sm text-muted">
          Ask an organization admin to update notification settings.
        </p>
      )}
    </form>
  );
}

function ChannelToggle({
  name,
  label,
  checked,
  disabled,
}: {
  name: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="notification-settings__channel flex min-h-11 items-center gap-2 rounded-lg border border-line bg-elev px-3 sm:min-h-10 sm:border-transparent sm:bg-transparent sm:px-0">
      <input
        type="checkbox"
        name={name}
        defaultChecked={checked}
        disabled={disabled}
        className="h-4 w-4 shrink-0"
      />
      {label}
    </label>
  );
}
