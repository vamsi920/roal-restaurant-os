import { PhoneCall } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatTicketClock } from "./order-card-parts";

type Props = {
  liveCount: number;
  lastUpdatedAt: string | null;
  compact?: boolean;
  /** Active calls without a linked draft cart yet. */
  supplementalCalls?: number;
  /** What the host is doing right now, e.g. "taking an order". */
  activity?: string | null;
  hostName?: string;
};

/**
 * One-line strip at the top of the Kitchen board:
 * "● 1 call live — taking an order" while the host is on the phone,
 * a quiet "Waiting for calls" otherwise.
 */
export function CallStatusStrip({
  liveCount,
  lastUpdatedAt,
  compact = false,
  supplementalCalls = 0,
  activity = null,
  hostName,
}: Props) {
  const live = liveCount > 0;
  const updated = formatTicketClock(lastUpdatedAt);

  return (
    <div
      className={cn(
        "flex min-w-0 max-w-full items-center gap-3 rounded-[14px] border",
        compact ? "px-3.5 py-2.5" : "px-4 py-3",
        live
          ? "border-warning/30 bg-[rgb(var(--tile-amber)/0.5)]"
          : "border-line bg-card"
      )}
      role="status"
      aria-live="polite"
    >
      {live ? (
        <span className="kds-live-dot" aria-hidden />
      ) : (
        <PhoneCall size={15} className="shrink-0 text-subtle" aria-hidden />
      )}
      <p className="min-w-0 flex-1 truncate text-[14px]">
        {live ? (
          <>
            <span className="font-semibold text-ink">
              {liveCount} call{liveCount === 1 ? "" : "s"} live
            </span>
            <span className="text-[rgb(var(--tile-amber-ink))]">
              {" "}
              — {activity ?? (hostName ? `${hostName} is on the phone` : "on the phone")}
            </span>
            {supplementalCalls > 0 && supplementalCalls < liveCount ? (
              <span className="text-muted"> · {supplementalCalls} without items yet</span>
            ) : null}
            <span className="sr-only">Call live</span>
          </>
        ) : (
          <span className="text-muted">
            Waiting for calls
            {hostName ? <span className="text-subtle"> · {hostName} picks up when the phone rings</span> : null}
          </span>
        )}
      </p>
      {lastUpdatedAt && updated ? (
        <p
          className="hidden shrink-0 truncate text-[12px] tabular-nums text-subtle sm:block"
          title={`Updated ${updated}`}
        >
          Updated {updated}
        </p>
      ) : null}
    </div>
  );
}
