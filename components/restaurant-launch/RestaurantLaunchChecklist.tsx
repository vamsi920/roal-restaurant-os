import Link from "next/link";
import { cn } from "@/lib/cn";
import type {
  LaunchChecklistStatus,
  RestaurantLaunchChecklistSnapshot,
} from "@/lib/restaurant-launch/types";

type Props = {
  snapshot: RestaurantLaunchChecklistSnapshot;
  compact?: boolean;
  className?: string;
};

function StatusIcon({ status }: { status: LaunchChecklistStatus }) {
  if (status === "ok") {
    return (
      <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-success/15 text-success">
        ✓
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-danger/10 text-danger">
        !
      </span>
    );
  }
  return (
    <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 border-line" />
  );
}

export function RestaurantLaunchChecklist({
  snapshot,
  compact = false,
  className,
}: Props) {
  return (
    <section
      className={cn(
        "restaurant-launch-checklist min-w-0 rounded-xl border border-line bg-card p-4 shadow-sm",
        className
      )}
      aria-labelledby="restaurant-launch-checklist-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2
            id="restaurant-launch-checklist-title"
            className="text-xs font-semibold text-ink"
          >
            Launch checklist
          </h2>
          {!compact ? (
            <p className="mt-1 text-xs text-muted">
              {snapshot.restaurantName} — real setup status before go-live.
            </p>
          ) : null}
        </div>
        <p className="text-xs font-medium tabular-nums text-subtle">
          {snapshot.completedCount}/{snapshot.totalCount}
        </p>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-elev">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            snapshot.isLaunchReady ? "bg-success" : "bg-accent"
          )}
          style={{
            width: `${Math.round((snapshot.completedCount / snapshot.totalCount) * 100)}%`,
          }}
        />
      </div>

      <ul className={cn("mt-3 space-y-2", compact && "space-y-1.5")}>
        {snapshot.items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className="flex gap-2 rounded-lg px-1 py-1 text-xs transition-colors hover:bg-elev/80"
            >
              <StatusIcon status={item.status} />
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "font-medium [overflow-wrap:anywhere]",
                    item.status === "ok" ? "text-muted" : "text-ink"
                  )}
                >
                  {item.label}
                </span>
                {item.detail ? (
                  <span className="mt-0.5 block text-muted [overflow-wrap:anywhere]">
                    {item.detail}
                  </span>
                ) : null}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {snapshot.isLaunchReady ? (
        <p className="mt-3 text-xs font-medium text-success">
          All launch checks passed.
        </p>
      ) : (
        <p className="mt-3 text-xs text-muted">
          Open each item to finish setup.
        </p>
      )}
    </section>
  );
}
