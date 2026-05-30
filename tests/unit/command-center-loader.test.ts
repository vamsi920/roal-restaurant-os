import { describe, expect, it } from "vitest";
import {
  buildCompletedOrdersFromReceipts,
  countSessionToolErrors,
  handoffSignalsFromTranscript,
  partitionCommandCenterSessions,
} from "@/lib/command-center/partition-command-center";
import type { AgentCallSession, UsageCallRow } from "@/lib/agent-calls/types";

const RESTAURANT_ID = "11111111-1111-4111-8111-111111111111";

function session(
  partial: Partial<AgentCallSession> & Pick<AgentCallSession, "sessionId">
): AgentCallSession {
  return {
    restaurantId: RESTAURANT_ID,
    sessionId: partial.sessionId,
    conversationId: partial.conversationId ?? partial.sessionId,
    agentId: partial.agentId ?? "agent_1",
    callerPhone: partial.callerPhone ?? "+15550001111",
    status: partial.status ?? "ended",
    outcome: partial.outcome ?? "unknown",
    startedAt: partial.startedAt ?? "2026-05-30T17:00:00.000Z",
    endedAt: partial.endedAt ?? "2026-05-30T17:10:00.000Z",
    transcriptMetadata: partial.transcriptMetadata ?? {},
    source: partial.source ?? "derived",
  };
}

describe("command center partition", () => {
  it("empty snapshot when no sessions or receipts", () => {
    const snap = partitionCommandCenterSessions({
      restaurantId: RESTAURANT_ID,
      restaurantName: "Test",
      linkedAgentId: null,
      rangeSince: "2026-05-30T00:00:00.000Z",
      rangeUntil: "2026-05-30T23:59:59.000Z",
      sessions: [],
      usageEvents: [],
      completedOrders: [],
    });
    expect(snap.isEmpty).toBe(true);
    expect(snap.counts).toEqual({
      active: 0,
      completed: 0,
      failed: 0,
      handoff: 0,
      unknown: 0,
    });
  });

  it("completed orders from receipts only", () => {
    const completed = buildCompletedOrdersFromReceipts([
      {
        session_id: "s_receipt",
        customer_name: "Alex",
        customer_phone: "+15551234567",
        items: [{ name: "Burger", quantity: 2, customizations: [] }],
        created_at: "2026-05-30T18:00:00.000Z",
      },
    ]);
    const snap = partitionCommandCenterSessions({
      restaurantId: RESTAURANT_ID,
      restaurantName: "Test",
      linkedAgentId: "agent_1",
      rangeSince: "2026-05-30T00:00:00.000Z",
      rangeUntil: "2026-05-30T23:59:59.000Z",
      sessions: [
        session({
          sessionId: "s_receipt",
          outcome: "order_completed",
          status: "ended",
        }),
      ],
      usageEvents: [],
      completedOrders: completed,
    });
    expect(snap.completedOrders).toHaveLength(1);
    expect(snap.completedOrders[0]?.lineCount).toBe(2);
    expect(snap.failedCalls).toHaveLength(0);
    expect(snap.unknownCalls).toHaveLength(0);
    expect(snap.isEmpty).toBe(false);
  });

  it("active bucket for in-progress sessions", () => {
    const snap = partitionCommandCenterSessions({
      restaurantId: RESTAURANT_ID,
      restaurantName: "Test",
      linkedAgentId: null,
      rangeSince: "2026-05-30T00:00:00.000Z",
      rangeUntil: "2026-05-30T23:59:59.000Z",
      sessions: [
        session({
          sessionId: "s_active",
          status: "active",
          outcome: "in_progress",
          endedAt: null,
        }),
      ],
      usageEvents: [],
      completedOrders: [],
    });
    expect(snap.activeCalls).toHaveLength(1);
    expect(snap.counts.active).toBe(1);
  });

  it("failed bucket for canceled and tool errors", () => {
    const usage: UsageCallRow[] = [
      {
        event_type: "tool_call",
        occurred_at: "2026-05-30T17:05:00.000Z",
        restaurant_id: RESTAURANT_ID,
        session_id: "s_tool_fail",
        metadata: { outcome: "error", http_status: 500 },
      },
    ];
    const snap = partitionCommandCenterSessions({
      restaurantId: RESTAURANT_ID,
      restaurantName: "Test",
      linkedAgentId: null,
      rangeSince: "2026-05-30T00:00:00.000Z",
      rangeUntil: "2026-05-30T23:59:59.000Z",
      sessions: [
        session({
          sessionId: "s_canceled",
          outcome: "canceled",
        }),
        session({
          sessionId: "s_tool_fail",
          outcome: "no_order",
        }),
      ],
      usageEvents: usage,
      completedOrders: [],
    });
    expect(snap.failedCalls).toHaveLength(2);
    expect(countSessionToolErrors(usage, "s_tool_fail")).toBe(1);
  });

  it("handoff bucket from transcript metadata", () => {
    const snap = partitionCommandCenterSessions({
      restaurantId: RESTAURANT_ID,
      restaurantName: "Test",
      linkedAgentId: null,
      rangeSince: "2026-05-30T00:00:00.000Z",
      rangeUntil: "2026-05-30T23:59:59.000Z",
      sessions: [
        session({
          sessionId: "s_handoff",
          outcome: "no_order",
          transcriptMetadata: { handoff_requested: true },
        }),
      ],
      usageEvents: [],
      completedOrders: [],
    });
    expect(snap.handoffCalls).toHaveLength(1);
    expect(handoffSignalsFromTranscript({ handoff_requested: true })).toContain(
      "handoff_requested"
    );
  });

  it("unknown bucket for ended no_order without handoff", () => {
    const snap = partitionCommandCenterSessions({
      restaurantId: RESTAURANT_ID,
      restaurantName: "Test",
      linkedAgentId: null,
      rangeSince: "2026-05-30T00:00:00.000Z",
      rangeUntil: "2026-05-30T23:59:59.000Z",
      sessions: [
        session({
          sessionId: "s_unknown",
          outcome: "no_order",
        }),
      ],
      usageEvents: [],
      completedOrders: [],
    });
    expect(snap.unknownCalls).toHaveLength(1);
  });
});
