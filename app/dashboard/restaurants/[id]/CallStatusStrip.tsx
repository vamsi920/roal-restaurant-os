import { cn } from "@/lib/cn";

type Props = {
  liveCount: number;
  lastUpdatedAt: string | null;
  compact?: boolean;
  /** Active calls without a linked draft cart yet. */
  supplementalCalls?: number;
};

function formatStripTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function CallStatusStrip({
  liveCount,
  lastUpdatedAt,
  compact = false,
  supplementalCalls = 0,
}: Props) {
  const live = liveCount > 0;

  return (
    <div
      className={cn(
        "kds-call-status flex min-w-0 max-w-full flex-wrap items-center justify-between gap-2",
        compact ? "kds-call-status--compact px-3 py-2 sm:px-4" : "px-3 py-3 sm:px-5",
        live ? "bg-warning/[0.06]" : "bg-elev/80"
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex min-w-0 items-center gap-2">
        <span
          className={cn(
            "h-2 w-2 shrink-0 rounded-full",
            live ? "bg-warning animate-pulse" : "bg-subtle"
          )}
          aria-hidden
        />
        <span className="text-sm font-semibold text-ink">
          {live ? "Call live" : "Waiting for calls"}
        </span>
        {live ? (
          <span className="rounded-md bg-card px-1.5 py-0.5 text-caption font-semibold tabular-nums text-muted">
            {liveCount}
          </span>
        ) : null}
        {supplementalCalls > 0 ? (
          <span className="text-caption text-muted">
            {supplementalCalls} without cart
          </span>
        ) : null}
      </div>
      {lastUpdatedAt ? (
        <p
          className="kds-call-status__updated min-w-0 max-w-full truncate text-caption text-muted sm:whitespace-normal"
          title={`Updated ${formatStripTime(lastUpdatedAt)}`}
        >
          Updated {formatStripTime(lastUpdatedAt)}
        </p>
      ) : null}
    </div>
  );
}
