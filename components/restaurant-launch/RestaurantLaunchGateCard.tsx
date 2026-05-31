import Link from "next/link";
import { cn } from "@/lib/cn";
import type { LaunchGatePhase, LaunchGateSnapshot } from "@/lib/restaurant-launch/types";

const PHASE_TONE: Record<LaunchGatePhase, string> = {
  ready: "bg-success/15 text-success border-success/30",
  almost_ready: "bg-warning/15 text-amber-900 border-warning/30",
  blocked: "bg-danger/10 text-danger border-danger/30",
};

type Props = {
  gate: LaunchGateSnapshot;
  compact?: boolean;
  className?: string;
};

export function RestaurantLaunchGateCard({ gate, compact = false, className }: Props) {
  return (
    <section
      className={cn(
        "restaurant-launch-gate min-w-0 rounded-xl border border-line bg-card p-4 shadow-sm",
        className
      )}
      aria-labelledby={`launch-gate-${gate.restaurantId}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-subtle">Launch readiness</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              id={`launch-gate-${gate.restaurantId}`}
              className={cn(
                "rounded-md border px-2 py-0.5 text-micro font-semibold uppercase tracking-wider",
                PHASE_TONE[gate.phase]
              )}
            >
              {gate.phaseLabel}
            </span>
            <span className="text-xs tabular-nums text-muted">
              {gate.checklist.completedCount}/{gate.checklist.totalCount} checks
            </span>
          </div>
          {gate.topBlockerLabel ? (
            <p className="mt-2 text-sm font-medium text-ink">
              {gate.topBlockerLabel}
            </p>
          ) : null}
          {gate.topBlockerDetail ? (
            <p className="mt-1 text-xs text-muted [overflow-wrap:anywhere]">
              {gate.topBlockerDetail}
            </p>
          ) : null}
          {!compact && gate.isLiveReady ? (
            <p className="mt-2 text-xs font-medium text-success">
              This location can take live phone orders now.
            </p>
          ) : null}
        </div>
        <Link
          href={gate.primaryAction.href}
          className="btn-primary kds-thumb-btn inline-flex min-h-11 shrink-0 items-center justify-center px-4 text-xs font-semibold sm:text-sm"
        >
          {gate.primaryAction.label}
        </Link>
      </div>
    </section>
  );
}
