import Link from "next/link";
import { cn } from "@/lib/cn";
import type { PhoneAgentReadinessSnapshot } from "@/lib/live-orders/readiness-from-profile";

const STATUS_TONE: Record<string, string> = {
  connected: "bg-success/15 text-success",
  misconfigured: "bg-warning/15 text-amber-900",
  unreachable: "bg-danger/10 text-danger",
  disconnected: "bg-elev text-muted",
};

const MENU_TONE: Record<string, string> = {
  ok: "bg-success/15 text-success",
  warn: "bg-warning/15 text-amber-900",
  error: "bg-danger/10 text-danger",
  neutral: "bg-elev text-muted",
};

function menuTone(
  readiness: PhoneAgentReadinessSnapshot
): keyof typeof MENU_TONE {
  if (!readiness.menuAutoSync.agentLinked) return "neutral";
  if (readiness.menuAutoSync.status === "failed") return "error";
  if (readiness.menuAutoSync.status === "syncing") return "warn";
  if (
    readiness.menuAutoSync.status === "succeeded" &&
    readiness.menuAutoSync.lastSyncedAt
  ) {
    return "ok";
  }
  return readiness.menuAutoSync.agentLinked ? "warn" : "neutral";
}

export function PhoneAgentReadinessStrip({
  restaurantId,
  readiness,
}: {
  restaurantId: string;
  readiness: PhoneAgentReadinessSnapshot;
}) {
  const agentTone =
    STATUS_TONE[readiness.connectionStatus] ?? STATUS_TONE.disconnected;

  return (
    <div
      className="kds-readiness-strip flex min-w-0 flex-wrap items-center gap-2"
      role="region"
      aria-label="Phone agent readiness"
    >
      <span
        className={cn(
          "rounded-md px-2 py-0.5 text-micro font-semibold uppercase tracking-wider",
          agentTone
        )}
      >
        {readiness.connectionLabel}
      </span>
      <span
        className={cn(
          "rounded-md px-2 py-0.5 text-micro font-semibold uppercase tracking-wider",
          MENU_TONE[menuTone(readiness)]
        )}
      >
        {readiness.menuSyncLabel}
      </span>
      <span
        className={cn(
          "rounded-md px-2 py-0.5 text-micro font-semibold uppercase tracking-wider",
          readiness.envReady ? MENU_TONE.ok : MENU_TONE.warn
        )}
      >
        {readiness.envReady ? "Server ready" : "Server config incomplete"}
      </span>
      <Link
        href={`/dashboard/restaurants/${restaurantId}/agent`}
        className="ml-auto text-xs font-medium text-accent hover:underline"
      >
        Live agent setup
      </Link>
    </div>
  );
}
