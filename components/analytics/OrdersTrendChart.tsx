import type { DailyOrderPoint } from "@/lib/analytics/types";
import { formatShortDate } from "@/components/analytics/format";

type Props = {
  points: DailyOrderPoint[];
};

export function OrdersTrendChart({ points }: Props) {
  const max = Math.max(
    1,
    ...points.map((p) => Math.max(p.voiceOrders, p.completed, p.canceled))
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-accent" aria-hidden />
          Voice orders
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-success" aria-hidden />
          Completed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-subtle" aria-hidden />
          Canceled
        </span>
      </div>

      {points.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">
          No daily data in this range yet.
        </p>
      ) : (
      <div className="flex items-end gap-1 overflow-x-auto pb-1 sm:gap-1.5">
        {points.map((point) => (
          <div
            key={point.date}
            className="flex min-w-[28px] flex-1 flex-col items-center gap-1"
            title={`${formatShortDate(point.date)}: ${point.voiceOrders} voice, ${point.completed} completed, ${point.canceled} canceled`}
          >
            <div className="flex h-24 w-full items-end justify-center gap-0.5">
              <Bar
                value={point.voiceOrders}
                max={max}
                className="bg-accent/80"
              />
              <Bar
                value={point.completed}
                max={max}
                className="bg-success/80"
              />
              <Bar
                value={point.canceled}
                max={max}
                className="bg-subtle/60"
              />
            </div>
            <span className="text-[10px] text-subtle">
              {formatShortDate(point.date)}
            </span>
          </div>
        ))}
      </div>
      )}
    </div>
  );
}

function Bar({
  value,
  max,
  className,
}: {
  value: number;
  max: number;
  className: string;
}) {
  const height = value > 0 ? Math.max(8, Math.round((value / max) * 96)) : 0;
  return (
    <div
      className={`w-1.5 rounded-t sm:w-2 ${className}`}
      style={{ height: `${height}px` }}
      aria-hidden
    />
  );
}
