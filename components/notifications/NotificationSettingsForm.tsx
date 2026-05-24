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
    <form action={action} className="space-y-8">
      <section className="rounded-xl border border-line bg-card p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-ink">Delivery mode</h2>
        <p className="mt-1 text-xs text-muted">
          Dev console logs to the server and delivery history below. Production
          enables webhook delivery; email and SMS stay human-setup until
          providers are wired.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="radio"
              name="provider_mode"
              value="dev_console"
              defaultChecked={settings.providerMode === "dev_console"}
              disabled={!canEdit}
            />
            Development console
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="radio"
              name="provider_mode"
              value="production"
              defaultChecked={settings.providerMode === "production"}
              disabled={!canEdit}
            />
            Production channels
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-line bg-card p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-ink">Events</h2>
        <ul className="mt-4 space-y-3">
          {NOTIFICATION_EVENT_TYPES.map((event) => (
            <li
              key={event}
              className="flex gap-3 rounded-lg border border-line bg-elev px-3 py-2.5"
            >
              <input
                type="checkbox"
                name={`event_${event}`}
                defaultChecked={settings.enabledEvents.includes(event)}
                disabled={!canEdit}
                className="mt-0.5"
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">
                  {NOTIFICATION_EVENT_LABELS[event]}
                </p>
                <p className="text-xs text-muted">
                  {NOTIFICATION_EVENT_DESCRIPTIONS[event]}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-4">
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">
            Stuck order threshold (minutes)
          </label>
          <input
            type="number"
            name="order_stuck_minutes"
            min={5}
            max={240}
            defaultValue={settings.orderStuckMinutes}
            disabled={!canEdit}
            className="input-base max-w-[8rem]"
          />
          <p className="mt-1 text-xs text-muted">
            Applies when &ldquo;Order stuck in kitchen&rdquo; is enabled above.
          </p>
        </div>
      </section>

      <section
        className={cn(
          "rounded-xl border border-line bg-card p-5 shadow-sm",
          !production && "opacity-60"
        )}
      >
        <h2 className="text-sm font-semibold text-ink">Channels</h2>
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
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">
              Email recipients
            </label>
            <textarea
              name="email_recipients"
              rows={2}
              defaultValue={settings.emailRecipients.join(", ")}
              disabled={!canEdit || !production}
              placeholder="ops@example.com, owner@example.com"
              className="input-base min-h-[4rem] resize-y"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">
              SMS numbers
            </label>
            <textarea
              name="sms_recipients"
              rows={2}
              defaultValue={settings.smsRecipients.join(", ")}
              disabled={!canEdit || !production}
              placeholder="+15551234567"
              className="input-base min-h-[4rem] resize-y"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted">
              Webhook URL
            </label>
            <input
              type="url"
              name="webhook_url"
              defaultValue={settings.webhookUrl ?? ""}
              disabled={!canEdit || !production}
              placeholder="https://hooks.example.com/roal"
              className="input-base"
            />
          </div>
        </div>
      </section>

      {state.error ? (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p className="text-sm text-success" role="status">
          Settings saved.
        </p>
      ) : null}

      {canEdit ? (
        <button type="submit" className="btn-primary">
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
    <label className="flex items-center gap-2">
      <input
        type="checkbox"
        name={name}
        defaultChecked={checked}
        disabled={disabled}
      />
      {label}
    </label>
  );
}
