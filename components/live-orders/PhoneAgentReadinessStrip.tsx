import Link from "next/link";
import { ArrowRight, CircleCheck, TriangleAlert } from "lucide-react";
import { Badge, type Tone } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { LaunchGatePhase, LaunchGateSnapshot } from "@/lib/restaurant-launch/types";

const PHASE_TONE: Record<LaunchGatePhase, Tone> = {
  ready: "ok",
  almost_ready: "warn",
  blocked: "bad",
};

/** One-line go-live status: phase badge, the top blocker, and the one next step. */
export function PhoneAgentReadinessStrip({
  launchGate,
}: {
  restaurantId: string;
  launchGate: LaunchGateSnapshot;
}) {
  const ready = launchGate.phase === "ready";
  const Icon = ready ? CircleCheck : TriangleAlert;
  return (
    <div
      className={cn(
        "flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 rounded-[14px] border bg-card px-4 py-3",
        ready ? "border-line" : "border-warning/30"
      )}
      role="region"
      aria-label="Launch readiness"
    >
      <Icon
        size={16}
        aria-hidden
        className={cn("shrink-0", ready ? "text-success" : "text-[rgb(var(--tile-amber-ink))]")}
      />
      <Badge tone={PHASE_TONE[launchGate.phase]}>{launchGate.phaseLabel}</Badge>
      <p className="min-w-0 flex-1 text-[13px] text-muted [overflow-wrap:anywhere]">
        {launchGate.topBlockerLabel ? (
          <>
            <span className="font-medium text-ink">{launchGate.topBlockerLabel}</span>
            {launchGate.topBlockerDetail ? ` — ${launchGate.topBlockerDetail}` : ""}
          </>
        ) : (
          "This location can take live phone orders now."
        )}
      </p>
      <Link href={launchGate.primaryAction.href} className="btn-ghost btn-sm shrink-0">
        {launchGate.primaryAction.label}
        <ArrowRight size={13} aria-hidden />
      </Link>
    </div>
  );
}
