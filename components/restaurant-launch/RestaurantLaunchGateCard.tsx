import Link from "next/link";
import { AlertTriangle, ArrowRight, CircleCheck, Rocket } from "lucide-react";
import { StatusChip, type Tone } from "@/components/dashboard/page-primitives";
import { IconTile, type TileColor } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { LaunchGatePhase, LaunchGateSnapshot } from "@/lib/restaurant-launch/types";

const PHASE_TONE: Record<LaunchGatePhase, Tone> = {
  ready: "ok",
  almost_ready: "warn",
  blocked: "bad",
};

const PHASE_TILE: Record<LaunchGatePhase, { icon: typeof Rocket; color: TileColor }> = {
  ready: { icon: CircleCheck, color: "green" },
  almost_ready: { icon: Rocket, color: "amber" },
  blocked: { icon: AlertTriangle, color: "rose" },
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
      className={cn("restaurant-launch-gate panel p-4", className)}
      aria-labelledby={`launch-gate-${gate.restaurantId}`}
    >
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
        <IconTile icon={PHASE_TILE[gate.phase].icon} color={PHASE_TILE[gate.phase].color} />
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
            <p className="mt-1.5 text-[14px] font-semibold text-ink">{gate.topBlockerLabel}</p>
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
        </div>
        <Link
          href={gate.primaryAction.href}
          className={cn("max-w-full shrink-0", gate.isLiveReady ? "btn-ghost" : "btn-primary")}
        >
          <span className="truncate">{gate.primaryAction.label}</span>
          <ArrowRight size={14} strokeWidth={2.25} aria-hidden />
        </Link>
      </div>
    </section>
  );
}
