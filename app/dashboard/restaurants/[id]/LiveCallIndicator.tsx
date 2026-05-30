"use client";

import { useMemo } from "react";
import { CallStatusStrip } from "./CallStatusStrip";
import type { CommandCenterCallRow } from "@/lib/command-center/types";
import type { DraftOrderRow } from "@/lib/types";
import { isVoiceCartStatus } from "@/lib/order-status";

type Props = {
  initialActiveCalls: CommandCenterCallRow[];
  liveCarts: DraftOrderRow[];
  draftRows: DraftOrderRow[];
};

export function LiveCallIndicator({
  initialActiveCalls,
  liveCarts,
  draftRows,
}: Props) {
  const liveCartSessions = useMemo(
    () => new Set(liveCarts.map((o) => o.session_id)),
    [liveCarts]
  );

  const supplementalCount = useMemo(
    () =>
      initialActiveCalls.filter((call) => !liveCartSessions.has(call.sessionId))
        .length,
    [initialActiveCalls, liveCartSessions]
  );

  const liveCount = liveCarts.length + supplementalCount;

  const lastUpdatedAt = useMemo(() => {
    if (liveCarts.length > 0) return liveCarts[0]?.updated_at ?? null;
    let latest = 0;
    let iso: string | null = null;
    for (const call of initialActiveCalls) {
      if (liveCartSessions.has(call.sessionId)) continue;
      const t = new Date(call.lastActivityAt).getTime();
      if (t > latest) {
        latest = t;
        iso = call.lastActivityAt;
      }
    }
    for (const o of draftRows) {
      if (!isVoiceCartStatus(o.status)) continue;
      const t = new Date(o.updated_at).getTime();
      if (t > latest) {
        latest = t;
        iso = o.updated_at;
      }
    }
    return iso;
  }, [liveCarts, initialActiveCalls, liveCartSessions, draftRows]);

  return (
    <CallStatusStrip
      compact
      liveCount={liveCount}
      lastUpdatedAt={lastUpdatedAt}
      supplementalCalls={supplementalCount}
    />
  );
}
