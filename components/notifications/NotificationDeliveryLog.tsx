import { BellOff } from "lucide-react";
import { Panel, StatusChip, formatWhen, type Tone } from "@/components/dashboard/page-primitives";
import { EmptyState } from "@/components/ui";
import type { NotificationDeliveryRow } from "@/lib/notifications/types";
import { NOTIFICATION_EVENT_LABELS } from "@/lib/notifications/types";

type Props = {
  deliveries: NotificationDeliveryRow[];
};

function statusTone(status: NotificationDeliveryRow["status"]): Tone {
  if (status === "sent") return "ok";
  if (status === "failed") return "bad";
  return "neutral";
}

export function NotificationDeliveryLog({ deliveries }: Props) {
  return (
    <Panel
      className="notification-delivery-log"
      title="Recent deliveries"
      hint="Dev console and production channel attempts, newest first."
      flush
    >
      {deliveries.length === 0 ? (
        <EmptyState
          icon={BellOff}
          title="No notifications yet"
          body="Alerts appear here as soon as an enabled event fires."
        />
      ) : (
        <ul className="notification-delivery-log__list max-h-[28rem] overflow-y-auto overscroll-y-contain">
          {deliveries.map((row) => (
            <li key={row.id} className="notification-delivery-log__row min-w-0 border-b border-line/70 px-[1.125rem] py-3 last:border-b-0">
              <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <span className="text-[13px] font-medium text-ink [overflow-wrap:anywhere]">
                  {row.title}
                </span>
                <span className="text-[12px] tabular-nums text-subtle">
                  {formatWhen(row.created_at)}
                </span>
              </div>
              <p className="mt-0.5 text-pretty text-[12px] text-muted [overflow-wrap:anywhere]">
                {row.body}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <StatusChip>{NOTIFICATION_EVENT_LABELS[row.event_type] ?? row.event_type}</StatusChip>
                <StatusChip>{row.channel}</StatusChip>
                <StatusChip tone={statusTone(row.status)}>{row.status}</StatusChip>
              </div>
              {row.error_message ? (
                <p className="mt-1 text-[12px] text-danger [overflow-wrap:anywhere]">
                  {row.error_message}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
