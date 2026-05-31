import { describe, expect, it } from "vitest";
import { buildRecentPhoneOutcomes } from "@/lib/live-orders/build-recent-outcomes";
import type { CommandCenterCallRow } from "@/lib/command-center/types";

function callRow(
  partial: Partial<CommandCenterCallRow> & Pick<CommandCenterCallRow, "sessionId">
): CommandCenterCallRow {
  return {
    conversationId: partial.conversationId ?? partial.sessionId,
    callerPhone: partial.callerPhone ?? "+15550001111",
    status: partial.status ?? "ended",
    outcome: partial.outcome ?? "unknown",
    startedAt: partial.startedAt ?? "2026-05-30T17:00:00.000Z",
    endedAt: partial.endedAt ?? "2026-05-30T17:10:00.000Z",
    lastActivityAt: partial.lastActivityAt ?? "2026-05-30T17:10:00.000Z",
    lineCount: partial.lineCount ?? 0,
    toolErrorCount: partial.toolErrorCount ?? 0,
    handoffSignals: partial.handoffSignals ?? [],
    sessionId: partial.sessionId,
  };
}

describe("buildRecentPhoneOutcomes", () => {
  it("returns empty when all buckets are empty", () => {
    expect(
      buildRecentPhoneOutcomes({ failed: [], handoff: [], unknown: [] })
    ).toEqual([]);
  });

  it("labels voicemail separately from generic handoff", () => {
    const outcomes = buildRecentPhoneOutcomes({
      failed: [],
      handoff: [
        callRow({
          sessionId: "vm",
          handoffSignals: ["voicemail_detected"],
        }),
        callRow({
          sessionId: "handoff",
          lastActivityAt: "2026-05-30T16:00:00.000Z",
          handoffSignals: ["manager_requested"],
        }),
      ],
      unknown: [],
    });
    expect(outcomes.map((row) => row.kind)).toEqual(["voicemail", "handoff"]);
  });

  it("includes failed and unknown no-order outcomes", () => {
    const outcomes = buildRecentPhoneOutcomes({
      failed: [
        callRow({
          sessionId: "failed",
          outcome: "canceled",
          lastActivityAt: "2026-05-30T18:00:00.000Z",
        }),
      ],
      handoff: [],
      unknown: [
        callRow({
          sessionId: "unknown",
          outcome: "no_order",
          lastActivityAt: "2026-05-30T17:00:00.000Z",
        }),
      ],
    });
    expect(outcomes.map((row) => row.kind)).toEqual(["failed", "unknown"]);
  });
});
