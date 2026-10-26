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

export function LaunchCheckMark({
  status,
  active = false,
}: {
  status: LaunchChecklistStatus | "done" | "pending";
  active?: boolean;
}) {
  const done = status === "ok" || status === "done";
  const error = status === "error";
  return (
    <span
      className={cn(
        "dashboard-checklist__mark",
        done && "dashboard-checklist__mark--done",
        error && "dashboard-checklist__mark--error",
        !done && !error && active && "dashboard-checklist__mark--active"
      )}
      aria-hidden
    >
      {done ? (
        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12l5 5L20 7" />
        </svg>
      ) : error ? (
        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <path d="M12 7v6M12 17h.01" />
        </svg>
      ) : null}
    </span>
  );
}

/** Real launch checks for one location, from the server-side evaluator. */
export function RestaurantLaunchChecklist({ snapshot, compact = false, className }: Props) {
  const percent = Math.round((snapshot.completedCount / Math.max(1, snapshot.totalCount)) * 100);
  const nextId = snapshot.items.find((item) => item.status !== "ok")?.id ?? null;

  return (
    <section
      className={cn("restaurant-launch-checklist dashboard-panel", className)}
      aria-labelledby="restaurant-launch-checklist-title"
    >
      <div className="dashboard-panel__head">
        <div className="min-w-0">
          <h2 id="restaurant-launch-checklist-title" className="dashboard-page__section-title">
            Launch checks
          </h2>
          {!compact ? (
            <p className="dashboard-panel__hint">{snapshot.restaurantName} — real status, nothing simulated.</p>
          ) : null}
        </div>
        <p className="text-[12px] font-medium tabular-nums text-subtle">
          {snapshot.completedCount}/{snapshot.totalCount}
        </p>
      </div>

      <div className="dashboard-progress mt-3" aria-hidden>
        <div
          className={cn("dashboard-progress__bar", snapshot.isLaunchReady && "dashboard-progress__bar--ok")}
          style={{ width: `${percent}%` }}
        />
      </div>

      <ul className="dashboard-checklist mt-2">
        {snapshot.items.map((item) => (
          <li
            key={item.id}
            className={cn(
              "dashboard-checklist__item",
              item.status === "ok" && "dashboard-checklist__item--done",
              compact && "py-2"
            )}
          >
            <LaunchCheckMark status={item.status} active={item.id === nextId} />
            <span className="min-w-0">
              <span className="dashboard-checklist__label text-[13px]">{item.label}</span>
              {item.detail && (!compact || item.status !== "ok") ? (
                <span className="dashboard-checklist__detail block">{item.detail}</span>
              ) : null}
            </span>
            <span className="dashboard-checklist__action">
              {item.status !== "ok" ? (
                <Link
                  href={item.href}
                  className={item.id === nextId ? "btn-primary btn-sm" : "btn-ghost btn-sm"}
                >
                  {item.status === "error" ? "Fix" : "Open"}
                </Link>
              ) : null}
            </span>
          </li>
        ))}
      </ul>

      <p className={cn("mt-2 text-[12px]", snapshot.isLaunchReady ? "font-medium text-success" : "text-muted")}>
        {snapshot.isLaunchReady ? "All launch checks passed." : "Open the next item to finish setup."}
      </p>
    </section>
  );
}
