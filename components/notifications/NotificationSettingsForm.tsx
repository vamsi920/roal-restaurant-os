"use client";

import { useFormState } from "react-dom";
import { Panel } from "@/components/dashboard/page-primitives";
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
    <form action={action} className="notification-settings min-w-0 space-y-4">
      <Panel
        className="notification-settings__mode"
        title="Delivery mode"
        hint="Dev console logs to the server and the history below. Production enables webhooks; email and SMS stay human-setup until providers are wired."
      >
        <div className="notification-settings__mode-options mt-3 grid gap-2 sm:grid-cols-2">
          <ModeOption
            value="dev_console"
            label="Development console"
            detail="Log every event, send nothing."
            checked={settings.providerMode === "dev_console"}
            disabled={!canEdit}
          />
          <ModeOption
            value="production"
            label="Production channels"
            detail="Deliver to the channels below."
            checked={settings.providerMode === "production"}
            disabled={!canEdit}
          />
        </div>
      </Panel>

      <Panel className="notification-settings__events" title="Events">
        <ul className="mt-3 divide-y divide-line/70">
          {NOTIFICATION_EVENT_TYPES.map((event) => (
            <li key={event}>
              <label className="notification-settings__event flex min-h-11 items-start gap-3 py-2.5 first:pt-0">
                <input
                  type="checkbox"
                  name={`event_${event}`}
                  defaultChecked={settings.enabledEvents.includes(event)}
                  disabled={!canEdit}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-ink"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium text-ink">
                    {NOTIFICATION_EVENT_LABELS[event]}
                  </span>
                  <span className="block text-[12px] text-muted [overflow-wrap:anywhere]">
                    {NOTIFICATION_EVENT_DESCRIPTIONS[event]}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        <div className="mt-4 border-t border-line pt-4">
          <label className="field-label" htmlFor="order_stuck_minutes">
            Stuck order threshold (minutes)
          </label>
          <input
            id="order_stuck_minutes"
            type="number"
            name="order_stuck_minutes"
            min={5}
            max={240}
            defaultValue={settings.orderStuckMinutes}
            disabled={!canEdit}
            className="input-base max-w-[8rem]"
          />
          <p className="mt-1.5 text-[12px] text-muted">
            Applies when &ldquo;Order stuck in kitchen&rdquo; is enabled above.
          </p>
        </div>
      </Panel>

      <Panel
        className={cn("notification-settings__channels", !production && "opacity-70")}
        title="Channels"
        hint={NOTIFICATION_PROVIDER_POSTURE.emailSmsHumanOnly}
      >
        {production ? (
          <p className="mt-3 rounded-md border border-line bg-elev px-3 py-2 text-[12px] text-muted">
            {NOTIFICATION_PROVIDER_POSTURE.webhookLive}
          </p>
        ) : null}
        <ul className="mt-3 grid gap-1 sm:grid-cols-2">
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

        <div className="mt-4 grid gap-4 border-t border-line pt-4">
          <div>
            <label className="field-label" htmlFor="email_recipients">
              Email recipients
            </label>
            <textarea
              id="email_recipients"
              name="email_recipients"
              rows={2}
              defaultValue={settings.emailRecipients.join(", ")}
              disabled={!canEdit || !production}
              placeholder="ops@example.com, owner@example.com"
              className="input-base min-h-[4rem] resize-y"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="sms_recipients">
              SMS numbers
            </label>
            <textarea
              id="sms_recipients"
              name="sms_recipients"
              rows={2}
              defaultValue={settings.smsRecipients.join(", ")}
              disabled={!canEdit || !production}
              placeholder="+15551234567"
              className="input-base min-h-[4rem] resize-y"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="webhook_url">
              Webhook URL
            </label>
            <input
              id="webhook_url"
              type="url"
              name="webhook_url"
              defaultValue={settings.webhookUrl ?? ""}
              disabled={!canEdit || !production}
              placeholder="https://hooks.example.com/roal"
              className="input-base"
            />
          </div>
        </div>
      </Panel>

      {state.error ? (
        <p
          className="notification-settings__error rounded-md border border-danger/25 bg-danger/5 px-3 py-2 text-[13px] text-danger [overflow-wrap:anywhere]"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p className="text-[13px] font-medium text-success" role="status">
          Settings saved.
        </p>
      ) : null}

      {canEdit ? (
        <div className="flex justify-end">
          <button type="submit" className="notification-settings__submit btn-primary w-full sm:w-auto">
            Save notification settings
          </button>
        </div>
      ) : (
        <p className="text-[13px] text-muted">
          Ask an organization admin to update notification settings.
        </p>
      )}
    </form>
  );
}

function ModeOption({
  value,
  label,
  detail,
  checked,
  disabled,
}: {
  value: string;
  label: string;
  detail: string;
  checked: boolean;
  disabled: boolean;
}) {
  return (
    <label className="notification-settings__radio flex min-h-11 items-start gap-3 rounded-md border border-line bg-card px-3 py-2.5 has-[:checked]:border-ink">
      <input
        type="radio"
        name="provider_mode"
        value={value}
        defaultChecked={checked}
        disabled={disabled}
        className="mt-0.5 h-4 w-4 shrink-0 accent-ink"
      />
      <span className="min-w-0">
        <span className="block text-[13px] font-medium text-ink">{label}</span>
        <span className="block text-[12px] text-muted">{detail}</span>
      </span>
    </label>
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
    <li>
      <label className="notification-settings__channel flex min-h-11 items-center gap-2.5 rounded-md px-2 text-[13px] text-ink hover:bg-elev lg:min-h-9">
        <input
          type="checkbox"
          name={name}
          defaultChecked={checked}
          disabled={disabled}
          className="h-4 w-4 shrink-0 accent-ink"
        />
        {label}
      </label>
    </li>
  );
}
