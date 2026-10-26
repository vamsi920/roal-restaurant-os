import { peakCallHoursFromEvents } from "@/lib/analytics/phone-ops-metrics";
import type { LiveOrdersRecentOutcome } from "@/lib/live-orders/build-recent-outcomes";

export type KdsPeakCallContext = {
  topHourLabel: string | null;
  topHourCallCount: number;
  totalCallsInRange: number;
  hasData: boolean;
};

export function buildKdsPeakCallContext(
  sessions: { startedAt: string }[],
  limit = 1
): KdsPeakCallContext {
  if (sessions.length === 0) {
    return {
      topHourLabel: null,
      topHourCallCount: 0,
      totalCallsInRange: 0,
      hasData: false,
    };
  }

  const peaks = peakCallHoursFromEvents(
    sessions.map((session) => ({
      restaurant_id: "",
      status: "ended",
      outcome: "unknown",
      started_at: session.startedAt,
      ended_at: null,
    })),
    limit
  );

  return {
    topHourLabel: peaks[0]?.label ?? null,
    topHourCallCount: peaks[0]?.orderCount ?? 0,
    totalCallsInRange: sessions.length,
    hasData: peaks.length > 0,
  };
}

export function kdsActionNeededOutcomeCount(
  outcomes: LiveOrdersRecentOutcome[]
): number {
  return outcomes.filter(
    (row) =>
      row.kind === "handoff" || row.kind === "voicemail" || row.kind === "failed"
  ).length;
}

export function kdsPeakCallContextCopy(context: KdsPeakCallContext): string {
  if (!context.hasData || !context.topHourLabel) {
    return "Peak call hour appears after recorded calls in this window.";
  }
  const callWord = context.topHourCallCount === 1 ? "call" : "calls";
  return `${context.topHourLabel} UTC · ${context.topHourCallCount} ${callWord} (${context.totalCallsInRange} recorded in range)`;
}
