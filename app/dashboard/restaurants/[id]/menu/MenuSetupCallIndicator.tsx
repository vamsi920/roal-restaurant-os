"use client";

import { useMemo, useState } from "react";
import { isSyncDraftOrderStatus, isVoiceCartStatus } from "@/lib/order-status";
import { fetchLiveJson, usePoll } from "@/lib/live/use-poll";
import { liveEndpoints } from "@/lib/live/endpoints";
import type { LiveCallStatusPayload } from "@/lib/live/load-live-orders";
import { cn } from "@/lib/cn";

type DraftStatusRow = LiveCallStatusPayload["drafts"][number];

/** "Call in progress" badge on the menu page — polls draft statuses for this restaurant. */
export function MenuSetupCallIndicator({ restaurantId }: { restaurantId: string }) {
  const [drafts, setDrafts] = useState<DraftStatusRow[]>([]);

  usePoll<LiveCallStatusPayload>(
    (signal) => fetchLiveJson<LiveCallStatusPayload>(liveEndpoints.callStatus(restaurantId), signal),
    { onData: (payload) => setDrafts(payload.drafts ?? []) }
  );

  const activeCallCount = useMemo(
    () => drafts.filter((o) => isVoiceCartStatus(o.status)).length,
    [drafts]
  );
  const syncingUpdateCount = useMemo(
    () =>
      drafts.filter(
        (o) =>
          typeof o.status === "string" &&
          isSyncDraftOrderStatus(o.status) &&
          !isVoiceCartStatus(o.status)
      ).length,
    [drafts]
  );
  const live = activeCallCount > 0 || syncingUpdateCount > 0;
  const liveLabel =
    activeCallCount > 0
      ? "Call in progress"
      : syncingUpdateCount > 0
        ? "Syncing menu updates"
        : "No active call";
  const liveCount = activeCallCount > 0 ? activeCallCount : syncingUpdateCount;

  if (!live) {
    return (
      <span className="sr-only" role="status" aria-live="polite">
        {liveLabel}
      </span>
    );
  }

  return (
    <span
      className={cn("badge", activeCallCount > 0 ? "badge--live" : "badge--info")}
      role="status"
      aria-live="polite"
      title={
        activeCallCount > 0
          ? "A guest is on the phone with your host right now"
          : "Order updates are syncing from a recent call"
      }
    >
      <span
        className="h-1.5 w-1.5 rounded-full bg-current motion-safe:animate-pulse"
        aria-hidden
      />
      {liveLabel}
      {liveCount > 1 ? <span className="tabular-nums">· {liveCount}</span> : null}
    </span>
  );
}
