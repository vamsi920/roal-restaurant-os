import { describe, expect, it } from "vitest";
import {
  buildCallHistoryRows,
  filterCallHistoryRows,
} from "@/lib/call-history/build-call-history-rows";
import type { AgentCallSession } from "@/lib/agent-calls/types";

const RESTAURANT_ID = "11111111-1111-4111-8111-111111111111";

function session(
  partial: Partial<AgentCallSession> & Pick<AgentCallSession, "sessionId">
): AgentCallSession {
  return {
    restaurantId: RESTAURANT_ID,
    sessionId: partial.sessionId,
    conversationId: partial.conversationId ?? partial.sessionId,
    agentId: partial.agentId ?? "agent_1",
    callerPhone: partial.callerPhone ?? "+15551234567",
    status: partial.status ?? "ended",
    outcome: partial.outcome ?? "order_completed",
    startedAt: partial.startedAt ?? "2026-05-30T17:00:00.000Z",
    endedAt: partial.endedAt ?? "2026-05-30T17:15:00.000Z",
    transcriptMetadata: partial.transcriptMetadata ?? {},
    source: partial.source ?? "derived",
  };
}

describe("buildCallHistoryRows", () => {
  it("builds rows from sessions with receipt line counts", () => {
    const rows = buildCallHistoryRows({
      sessions: [session({ sessionId: "conv_abc" })],
      drafts: [],
      receipts: [
        {
          restaurant_id: RESTAURANT_ID,
          session_id: "conv_abc",
          customer_name: "Sam",
          customer_phone: "+15551234567",
          items: [{ name: "Burger", quantity: 2, customizations: [] }],
          created_at: "2026-05-30T17:15:00.000Z",
        },
      ],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.lineCount).toBe(2);
    expect(rows[0]?.callerName).toBe("Sam");
    expect(rows[0]?.outcomeLabel).toBe("Order completed");
  });

  it("sorts by occurredAt descending", () => {
    const rows = buildCallHistoryRows({
      sessions: [
        session({
          sessionId: "old",
          startedAt: "2026-05-30T10:00:00.000Z",
          endedAt: "2026-05-30T10:05:00.000Z",
        }),
        session({
          sessionId: "new",
          startedAt: "2026-05-30T18:00:00.000Z",
          endedAt: "2026-05-30T18:10:00.000Z",
        }),
      ],
      drafts: [],
      receipts: [],
    });
    expect(rows[0]?.sessionId).toBe("new");
  });
});

describe("filterCallHistoryRows", () => {
  const rows = buildCallHistoryRows({
    sessions: [
      session({ sessionId: "a", outcome: "order_completed" }),
      session({ sessionId: "b", outcome: "canceled" }),
      session({
        sessionId: "c",
        outcome: "in_progress",
        status: "active",
        endedAt: null,
      }),
    ],
    drafts: [],
    receipts: [],
  });

  it("filters completed outcomes", () => {
    expect(filterCallHistoryRows(rows, "completed")).toHaveLength(1);
  });

  it("filters failed outcomes", () => {
    expect(filterCallHistoryRows(rows, "failed")).toHaveLength(1);
  });
});
