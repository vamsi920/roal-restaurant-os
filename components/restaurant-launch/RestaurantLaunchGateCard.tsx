import Link from "next/link";
import { StatusChip, type Tone } from "@/components/dashboard/page-primitives";
import { cn } from "@/lib/cn";
import type { LaunchGatePhase, LaunchGateSnapshot } from "@/lib/restaurant-launch/types";

const PHASE_TONE: Record<LaunchGatePhase, Tone> = {
  ready: "ok",
  almost_ready: "warn",
  blocked: "bad",
};

type Props = {
  gate: LaunchGateSnapshot;
  compact?: boolean;
  className?: string;
};

/** One-line launch posture with the single next action. */
export function RestaurantLaunchGateCard({ gate, compact = false, className }: Props) {
  return (
    <section
      className={cn("restaurant-launch-gate dashboard-panel", className)}
      aria-labelledby={`launch-gate-${gate.restaurantId}`}
    >
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip tone={PHASE_TONE[gate.phase]}>
              <span id={`launch-gate-${gate.restaurantId}`}>{gate.phaseLabel}</span>
            </StatusChip>
            <span className="text-[12px] tabular-nums text-subtle">
              {gate.checklist.completedCount}/{gate.checklist.totalCount} checks
            </span>
          </div>
          {gate.topBlockerLabel ? (
            <p className="mt-1.5 text-[14px] font-medium text-ink">{gate.topBlockerLabel}</p>
          ) : null}
          {gate.topBlockerDetail ? (
            <p className="mt-0.5 text-[12px] text-muted [overflow-wrap:anywhere]">
              {gate.topBlockerDetail}
            </p>
          ) : null}
          {!compact && gate.isLiveReady ? (
            <p className="mt-1.5 text-[12px] font-medium text-success">
              This location can take live phone orders now.
            </p>
          ) : null}
        </div>
        <Link
          href={gate.primaryAction.href}
          className={cn("shrink-0", gate.isLiveReady ? "btn-ghost" : "btn-primary")}
        >
          {gate.primaryAction.label}
        </Link>
      </div>
    </section>
  );
}
