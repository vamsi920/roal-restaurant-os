import type { ReactNode } from "react";
import type { NotificationDeliveryRow } from "@/lib/notifications/types";
import { NOTIFICATION_EVENT_LABELS } from "@/lib/notifications/types";
import { cn } from "@/lib/cn";

type Props = {
  deliveries: NotificationDeliveryRow[];
};

export function NotificationDeliveryLog({ deliveries }: Props) {
  return (
    <section className="rounded-xl border border-line bg-card p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-ink">Recent deliveries</h2>
      <p className="mt-1 text-xs text-muted">
        Dev console and production channel attempts (newest first).
      </p>
      {deliveries.length === 0 ? (
        <p className="mt-6 text-sm text-muted">No notifications yet.</p>
      ) : (
        <ul className="mt-4 max-h-[28rem] space-y-2 overflow-y-auto">
          {deliveries.map((row) => (
            <li
              key={row.id}
              className="rounded-lg border border-line bg-elev px-3 py-2.5 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-ink">{row.title}</span>
                <span className="text-[10px] uppercase tracking-wider text-subtle">
                  {formatWhen(row.created_at)}
                </span>
              </div>
              <p className="mt-1 text-pretty text-xs text-muted">{row.body}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-[10px] uppercase tracking-wider">
                <Badge>
                  {NOTIFICATION_EVENT_LABELS[row.event_type] ?? row.event_type}
                </Badge>
                <Badge>{row.channel}</Badge>
                <Badge
                  className={cn(
                    row.status === "sent" && "text-success",
                    row.status === "failed" && "text-danger",
                    row.status === "skipped" && "text-muted"
                  )}
                >
                  {row.status}
                </Badge>
              </div>
              {row.error_message ? (
                <p className="mt-1 text-xs text-subtle">{row.error_message}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Badge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "rounded-md border border-line bg-card px-1.5 py-0.5 text-subtle",
        className
      )}
    >
      {children}
    </span>
  );
}

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}
