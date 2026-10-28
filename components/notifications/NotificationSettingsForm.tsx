"use client";

import { useFormState } from "react-dom";
import { Panel } from "@/components/dashboard/page-primitives";
import {
  NOTIFICATION_EVENT_DESCRIPTIONS,
  NOTIFICATION_EVENT_LABELS,
  NOTIFICATION_EVENT_TYPES,
} from "@/lib/notifications/types";
import type { NotificationSettings } from "@/lib/notifications/types";
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

  return (
    <form action={action} className="notification-settings min-w-0 space-y-4">
      {/* Owners choose what and who; delivery plumbing (console/webhooks) is ROAL's concern. */}
      <input type="hidden" name="provider_mode" value="production" />
      <p className="rounded-[10px] border border-line bg-elev px-3 py-2.5 text-[13px] text-muted">
        Pick the alerts you care about and who should get them. Email and text delivery is switching on soon; until
        then every alert shows up in the history below.
      </p>

      <Panel className="notification-settings__events" title="What to alert you about">
        <ul className="-my-1 divide-y divide-line/70">
          {NOTIFICATION_EVENT_TYPES.map((event) => (
            <li key={event}>
              <label className="notification-settings__event flex min-h-11 cursor-pointer items-start gap-3 py-2.5">
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
            Alert me when an order waits longer than (minutes)
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

      <Panel className="notification-settings__channels" title="Who gets alerts">
        <ul className="mt-3 grid gap-1 first:mt-0 sm:grid-cols-2">
          <ChannelToggle
            name="channel_email"
            label="Email"
            checked={settings.channels.email}
            disabled={!canEdit}
          />
          <ChannelToggle
            name="channel_sms"
            label="SMS"
            checked={settings.channels.sms}
            disabled={!canEdit}
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
              disabled={!canEdit}
              placeholder="you@restaurant.com, manager@restaurant.com"
              className="input-base min-h-[4rem] resize-y"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="sms_recipients">
              Mobile numbers for texts
            </label>
            <textarea
              id="sms_recipients"
              name="sms_recipients"
              rows={2}
              defaultValue={settings.smsRecipients.join(", ")}
              disabled={!canEdit}
              placeholder="+15551234567"
              className="input-base min-h-[4rem] resize-y"
            />
          </div>
        </div>
      </Panel>

      {state.error ? (
        <p
          className="notification-settings__error rounded-[10px] border border-danger/25 bg-danger/5 px-3 py-2 text-[13px] text-danger [overflow-wrap:anywhere]"
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
      <label className="notification-settings__channel flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg px-2 text-[13px] text-ink hover:bg-elev lg:min-h-9">
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
