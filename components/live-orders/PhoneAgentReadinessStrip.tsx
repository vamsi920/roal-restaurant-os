import Link from "next/link";
import { cn } from "@/lib/cn";
import type { LaunchGatePhase, LaunchGateSnapshot } from "@/lib/restaurant-launch/types";

const PHASE_TONE: Record<LaunchGatePhase, string> = {
  ready: "bg-success/15 text-success",
  almost_ready: "bg-warning/15 text-amber-900",
  blocked: "bg-danger/10 text-danger",
};

export function PhoneAgentReadinessStrip({
  launchGate,
}: {
  restaurantId: string;
  launchGate: LaunchGateSnapshot;
}) {
  return (
    <div
      className="kds-readiness-strip flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center"
      role="region"
      aria-label="Launch readiness"
    >
      <span
        className={cn(
          "rounded-md px-2 py-0.5 text-micro font-semibold uppercase tracking-wider",
          PHASE_TONE[launchGate.phase]
        )}
      >
        {launchGate.phaseLabel}
      </span>
      {launchGate.topBlockerLabel ? (
        <span className="min-w-0 text-xs text-muted [overflow-wrap:anywhere]">
          {launchGate.topBlockerLabel}
          {launchGate.topBlockerDetail ? ` — ${launchGate.topBlockerDetail}` : ""}
        </span>
      ) : (
        <span className="text-xs text-success">
          This location can take live phone orders now.
        </span>
      )}
      <Link
        href={launchGate.primaryAction.href}
        className="sm:ml-auto text-xs font-semibold text-accent hover:underline"
      >
        {launchGate.primaryAction.label}
      </Link>
    </div>
  );
}
