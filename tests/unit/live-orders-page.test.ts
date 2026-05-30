import { describe, expect, it } from "vitest";
import { buildRecentPhoneOutcomes } from "@/lib/live-orders/build-recent-outcomes";
import {
  deriveProfileConnectionStatus,
  menuSyncLabelFromSnapshot,
  phoneAgentReadinessFromProfile,
} from "@/lib/live-orders/readiness-from-profile";
import type { CommandCenterCallRow } from "@/lib/command-center/types";

function callRow(
  partial: Partial<CommandCenterCallRow> & Pick<CommandCenterCallRow, "sessionId">
): CommandCenterCallRow {
  return {
    conversationId: partial.sessionId,
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

describe("phoneAgentReadinessFromProfile", () => {
  it("disconnected when no agent linked", () => {
    const r = phoneAgentReadinessFromProfile({
      elevenlabs_agent_id: null,
      elevenlabs_last_sync_at: null,
      elevenlabs_last_sync_error: null,
      elevenlabs_menu_auto_sync_status: null,
      elevenlabs_menu_auto_sync_error: null,
    });
    expect(deriveProfileConnectionStatus({
      elevenlabs_agent_id: null,
      elevenlabs_last_sync_at: null,
      elevenlabs_last_sync_error: null,
    })).toBe("disconnected");
    expect(r.connectionLabel).toBe("Not connected");
  });

  it("connected when agent synced without error", () => {
    const r = phoneAgentReadinessFromProfile({
      elevenlabs_agent_id: "agent_1",
      elevenlabs_last_sync_at: "2026-05-30T12:00:00.000Z",
      elevenlabs_last_sync_error: null,
      elevenlabs_menu_auto_sync_status: "succeeded",
      elevenlabs_menu_auto_sync_error: null,
    });
    expect(r.connectionStatus).toBe("connected");
    expect(menuSyncLabelFromSnapshot(r.menuAutoSync)).toBe("Menu synced");
  });
});

describe("buildRecentPhoneOutcomes", () => {
  it("merges and sorts outcomes by time", () => {
    const outcomes = buildRecentPhoneOutcomes({
      failed: [
        callRow({
          sessionId: "s_fail",
          lastActivityAt: "2026-05-30T16:00:00.000Z",
          outcome: "canceled",
        }),
      ],
      handoff: [
        callRow({
          sessionId: "s_handoff",
          lastActivityAt: "2026-05-30T18:00:00.000Z",
          handoffSignals: ["handoff_requested"],
        }),
      ],
      unknown: [],
      limit: 5,
    });
    expect(outcomes).toHaveLength(2);
    expect(outcomes[0]?.kind).toBe("handoff");
    expect(outcomes[1]?.kind).toBe("failed");
  });

  it("returns empty list when no outcome rows", () => {
    expect(
      buildRecentPhoneOutcomes({ failed: [], handoff: [], unknown: [] })
    ).toEqual([]);
  });
});
