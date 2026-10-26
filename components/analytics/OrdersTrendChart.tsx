import type { DailyOrderPoint } from "@/lib/analytics/types";
import { formatShortDate } from "@/components/analytics/format";

type Props = {
  points: DailyOrderPoint[];
};

const SERIES = [
  { key: "orderSessions", label: "Order sessions", className: "bg-ink/70" },
  { key: "completed", label: "Completed", className: "bg-success/80" },
  { key: "canceled", label: "Canceled", className: "bg-line-strong" },
] as const;

export function OrdersTrendChart({ points }: Props) {
  const max = Math.max(
    1,
    ...points.map((p) => Math.max(p.orderSessions, p.completed, p.canceled))
  );

  return (
    <div className="orders-trend-chart min-w-0 space-y-3">
      <div className="orders-trend-chart__legend flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted">
        {SERIES.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-sm ${s.className}`} aria-hidden />
            {s.label}
          </span>
        ))}
      </div>

      {points.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-muted">No daily data in this range yet.</p>
      ) : (
        <div
          className="orders-trend-chart__scroll flex min-w-0 items-end gap-1 overflow-x-auto overscroll-x-contain pb-1 sm:gap-1.5"
          role="list"
          aria-label="Daily order sessions chart"
        >
          {points.map((point) => (
            <div
              key={point.date}
              role="listitem"
              className="orders-trend-chart__day flex min-w-[2.25rem] shrink-0 flex-col items-center gap-1 sm:min-w-[28px] sm:flex-1"
              title={`${formatShortDate(point.date)}: ${point.orderSessions} sessions, ${point.completed} completed, ${point.canceled} canceled`}
            >
              <div className="flex h-24 w-full items-end justify-center gap-0.5 border-b border-line">
                <Bar value={point.orderSessions} max={max} className={SERIES[0].className} />
                <Bar value={point.completed} max={max} className={SERIES[1].className} />
                <Bar value={point.canceled} max={max} className={SERIES[2].className} />
              </div>
              <span className="text-[10px] tabular-nums text-subtle">{formatShortDate(point.date)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Bar({ value, max, className }: { value: number; max: number; className: string }) {
  const height = value > 0 ? Math.max(6, Math.round((value / max) * 92)) : 0;
  return (
    <div
      className={`w-1.5 rounded-t-sm sm:w-2 ${className}`}
      style={{ height: `${height}px` }}
      aria-hidden
    />
  );
}
