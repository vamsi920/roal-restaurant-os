import Link from "next/link";
import { AlertCircle, Check } from "lucide-react";
import { cn } from "@/lib/cn";
import "@/components/dashboard/org-pages.css";
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
        "org-checklist__mark",
        done && "org-checklist__mark--done",
        error && "org-checklist__mark--error",
        !done && !error && active && "org-checklist__mark--active"
      )}
      aria-hidden
    >
      {done ? (
        <Check size={12} strokeWidth={3} />
      ) : error ? (
        <AlertCircle size={13} strokeWidth={2.5} />
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
      className={cn("restaurant-launch-checklist panel", className)}
      aria-labelledby="restaurant-launch-checklist-title"
    >
      <div className="panel__head">
        <div className="min-w-0">
          <h2 id="restaurant-launch-checklist-title" className="panel__title">
            Launch checks
          </h2>
          {!compact ? (
            <p className="org-panel__hint">{snapshot.restaurantName} — real status, nothing simulated.</p>
          ) : null}
        </div>
        <span
          className={cn("badge shrink-0 tabular-nums", snapshot.isLaunchReady && "badge--ok")}
        >
          {snapshot.completedCount}/{snapshot.totalCount}
        </span>
      </div>

      <div className="panel__body">
        <div
          className="org-progress"
          role="progressbar"
          aria-label="Launch checks complete"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={cn("org-progress__bar", snapshot.isLaunchReady && "org-progress__bar--ok")}
            style={{ width: `${percent}%` }}
          />
        </div>

        <ul className="org-checklist mt-2">
          {snapshot.items.map((item) => (
            <li
              key={item.id}
              className={cn(
                "org-checklist__item",
                item.status === "ok" && "org-checklist__item--done",
                compact && "py-2"
              )}
            >
              <LaunchCheckMark status={item.status} active={item.id === nextId} />
              <span className="min-w-0">
                <span className="org-checklist__label">{item.label}</span>
                {item.detail && (!compact || item.status !== "ok") ? (
                  <span className="org-checklist__detail">{item.detail}</span>
                ) : null}
              </span>
              <span className="org-checklist__action">
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

        <p className={cn("mt-2 text-[12.5px]", snapshot.isLaunchReady ? "font-medium text-success" : "text-subtle")}>
          {snapshot.isLaunchReady ? "All launch checks passed." : "Open the next item to finish setup."}
        </p>
      </div>
    </section>
  );
}
