import { KdsEmptyStatePanel } from "@/components/dashboard/kds-workspace-states";
import type { LiveOrdersRecentOutcome } from "@/lib/live-orders/build-recent-outcomes";

function formatWhen(iso: string): string {
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  }).format(ms);
}

function formatCaller(phone: string | null): string {
  return phone?.trim() || "Unknown caller";
}

const KIND_LABEL: Record<LiveOrdersRecentOutcome["kind"], string> = {
  failed: "Failed",
  handoff: "Handoff",
  unknown: "Unknown",
};

const KIND_CLASS: Record<LiveOrdersRecentOutcome["kind"], string> = {
  failed: "bg-danger/10 text-danger",
  handoff: "bg-warning/15 text-amber-900",
  unknown: "bg-elev text-muted",
};

export function RecentPhoneOutcomesPanel({
  outcomes,
  rangeSince,
  rangeUntil,
  empty,
}: {
  outcomes: LiveOrdersRecentOutcome[];
  rangeSince: string;
  rangeUntil: string;
  empty: boolean;
}) {
  return (
    <aside
      className="kds-outcomes-panel kds-panel min-w-0 max-w-full"
      aria-labelledby="kds-outcomes-heading"
    >
      <header className="kds-panel__header border-b border-line px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <h2
            id="kds-outcomes-heading"
            className="kds-panel__title text-sm font-semibold text-ink"
          >
            Recent outcomes
          </h2>
          <p className="kds-panel__lead mt-1">
            Failed calls, handoffs, and unclear endings from the last 48 hours.
          </p>
        </div>
      </header>
      <div className="kds-outcomes-panel__body p-3 sm:p-4">
        {empty ? (
          <KdsEmptyStatePanel
            tone="calm"
            icon="orders"
            title="No recent outcomes"
          >
            Nothing to review in this window yet.
          </KdsEmptyStatePanel>
        ) : (
          <ul className="space-y-2">
            {outcomes.map((row) => (
              <li
                key={`${row.kind}-${row.sessionId}`}
                className="rounded-lg border border-line bg-elev/30 px-3 py-2 text-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-micro font-semibold uppercase ${KIND_CLASS[row.kind]}`}
                  >
                    {KIND_LABEL[row.kind]}
                  </span>
                  <time className="text-xs text-muted" dateTime={row.occurredAt}>
                    {formatWhen(row.occurredAt)}
                  </time>
                </div>
                <p className="mt-1 font-medium text-ink">{row.headline}</p>
                <p className="text-xs text-muted">{formatCaller(row.callerPhone)}</p>
                {row.detail ? (
                  <p className="mt-1 text-xs text-subtle">{row.detail}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-caption text-subtle">
          {formatWhen(rangeSince)} – {formatWhen(rangeUntil)}
        </p>
      </div>
    </aside>
  );
}
