import { describe, expect, it } from "vitest";
import { classifyAgentCallOutcome } from "@/lib/agent-calls/classify-outcome";
import {
  countActiveDerivedCalls,
  deriveAgentCallSessions,
} from "@/lib/agent-calls/derive-call-sessions";
import type { DraftOrderCallRow } from "@/lib/agent-calls/types";

const RESTAURANT_ID = "11111111-1111-4111-8111-111111111111";
const SESSION = "conv_session_abc";
const AGENT = "agent_loc_01";
const NOW = new Date("2026-05-30T18:00:00.000Z");

function draft(
  partial: Partial<DraftOrderCallRow> & Pick<DraftOrderCallRow, "session_id">
): DraftOrderCallRow {
  return {
    restaurant_id: RESTAURANT_ID,
    session_id: partial.session_id,
    status: partial.status ?? "draft",
    items: partial.items ?? [],
    customer_name: partial.customer_name ?? null,
    customer_phone: partial.customer_phone ?? null,
    created_at: partial.created_at ?? "2026-05-30T17:00:00.000Z",
    updated_at: partial.updated_at ?? "2026-05-30T17:00:00.000Z",
    completed_at: partial.completed_at ?? null,
    canceled_at: partial.canceled_at ?? null,
  };
}

describe("classifyAgentCallOutcome", () => {
  it("order_completed when receipt exists", () => {
    const outcome = classifyAgentCallOutcome({
      draft: draft({ session_id: SESSION, status: "draft" }),
      receipt: {
        restaurant_id: RESTAURANT_ID,
        session_id: SESSION,
        customer_name: null,
        customer_phone: "+15551234567",
        items: [],
        created_at: "2026-05-30T17:30:00.000Z",
      },
      usage: [],
      now: NOW,
      abandonedAfterMs: 30 * 60 * 1000,
    });
    expect(outcome).toBe("order_completed");
  });

  it("abandoned when draft has items and is stale", () => {
    const outcome = classifyAgentCallOutcome({
      draft: draft({
        session_id: SESSION,
        items: [{ name: "Burger", quantity: 1, customizations: [] }],
        updated_at: "2026-05-30T16:00:00.000Z",
      }),
      receipt: null,
      usage: [],
      now: NOW,
      abandonedAfterMs: 30 * 60 * 1000,
    });
    expect(outcome).toBe("abandoned");
  });

  it("no_order when only get_menu tool_call", () => {
    const outcome = classifyAgentCallOutcome({
      draft: null,
      receipt: null,
      usage: [
        {
          event_type: "tool_call",
          occurred_at: "2026-05-30T17:55:00.000Z",
          restaurant_id: RESTAURANT_ID,
          session_id: SESSION,
          metadata: { tool: "get_menu_items", http_status: 200, outcome: "success" },
        },
      ],
      now: NOW,
      abandonedAfterMs: 30 * 60 * 1000,
    });
    expect(outcome).toBe("no_order");
  });
});

describe("deriveAgentCallSessions", () => {
  it("unions session ids from drafts, receipts, and usage_events", () => {
    const sessions = deriveAgentCallSessions({
      restaurantId: RESTAURANT_ID,
      linkedAgentId: AGENT,
      drafts: [],
      receipts: [],
      usageEvents: [
        {
          event_type: "tool_call",
          occurred_at: "2026-05-30T17:00:00.000Z",
          restaurant_id: RESTAURANT_ID,
          session_id: "usage_only_session",
          metadata: { tool: "get_menu_items" },
        },
      ],
      now: NOW,
    });

    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.sessionId).toBe("usage_only_session");
    expect(sessions[0]?.agentId).toBe(AGENT);
    expect(sessions[0]?.source).toBe("derived");
  });

  it("merges stored agent_call_events over derived fields", () => {
    const sessions = deriveAgentCallSessions({
      restaurantId: RESTAURANT_ID,
      linkedAgentId: AGENT,
      drafts: [
        draft({
          session_id: SESSION,
          customer_phone: "+15551111111",
        }),
      ],
      receipts: [],
      usageEvents: [],
      storedEvents: [
        {
          restaurant_id: RESTAURANT_ID,
          agent_id: "agent_webhook",
          conversation_id: "el_conv_99",
          session_id: SESSION,
          caller_phone: "+15552222222",
          status: "ended",
          outcome: "order_completed",
          started_at: "2026-05-30T16:30:00.000Z",
          ended_at: "2026-05-30T17:45:00.000Z",
          transcript_metadata: { summary: "Guest ordered two burgers." },
        },
      ],
      now: NOW,
    });

    expect(sessions[0]).toMatchObject({
      sessionId: SESSION,
      conversationId: "el_conv_99",
      agentId: "agent_webhook",
      callerPhone: "+15552222222",
      outcome: "no_order",
      status: "ended",
      source: "stored",
      transcriptMetadata: { summary: "Guest ordered two burgers." },
    });
  });

  it("does not keep webhook-only order_completed without a receipt", () => {
    const sessions = deriveAgentCallSessions({
      restaurantId: RESTAURANT_ID,
      linkedAgentId: AGENT,
      drafts: [],
      receipts: [],
      usageEvents: [
        {
          event_type: "order_completed",
          occurred_at: "2026-05-30T17:40:00.000Z",
          restaurant_id: RESTAURANT_ID,
          session_id: SESSION,
          metadata: { line_count: 2 },
        },
      ],
      storedEvents: [
        {
          restaurant_id: RESTAURANT_ID,
          agent_id: AGENT,
          conversation_id: SESSION,
          session_id: SESSION,
          caller_phone: "+15551111111",
          status: "ended",
          outcome: "order_completed",
          started_at: "2026-05-30T17:00:00.000Z",
          ended_at: "2026-05-30T17:41:00.000Z",
          transcript_metadata: {
            transcript: [{ role: "agent", tool_calls: [{ name: "finalize_order" }] }],
          },
        },
      ],
      now: NOW,
    });

    expect(sessions[0]?.outcome).toBe("no_order");
  });

  it("counts active in-progress calls within window", () => {
    const sessions = deriveAgentCallSessions({
      restaurantId: RESTAURANT_ID,
      drafts: [
        draft({
          session_id: "live_1",
          items: [{ name: "Salad", quantity: 1, customizations: [] }],
          created_at: "2026-05-30T17:50:00.000Z",
          updated_at: "2026-05-30T17:50:00.000Z",
        }),
      ],
      receipts: [],
      usageEvents: [],
      now: NOW,
      activeWithinMs: 15 * 60 * 1000,
    });

    expect(countActiveDerivedCalls(sessions, NOW)).toBe(1);
  });

  it("keeps receipt-completed outcome when stored webhook outcome is unknown", () => {
    const sessions = deriveAgentCallSessions({
      restaurantId: RESTAURANT_ID,
      linkedAgentId: AGENT,
      drafts: [],
      receipts: [
        {
          restaurant_id: RESTAURANT_ID,
          session_id: SESSION,
          customer_name: "Alex",
          customer_phone: "+15551111111",
          items: [],
          created_at: "2026-05-30T17:40:00.000Z",
        },
      ],
      usageEvents: [],
      storedEvents: [
        {
          restaurant_id: RESTAURANT_ID,
          agent_id: AGENT,
          conversation_id: SESSION,
          session_id: SESSION,
          caller_phone: "+15551111111",
          status: "ended",
          outcome: "unknown",
          started_at: "2026-05-30T17:00:00.000Z",
          ended_at: "2026-05-30T17:41:00.000Z",
          transcript_metadata: { summary: "Webhook arrived without outcome." },
        },
      ],
      now: NOW,
    });

    expect(sessions[0]?.outcome).toBe("order_completed");
    expect(sessions[0]?.source).toBe("stored");
  });

  it("includes webhook-only calls with no draft or receipt rows", () => {
    const sessions = deriveAgentCallSessions({
      restaurantId: RESTAURANT_ID,
      linkedAgentId: AGENT,
      drafts: [],
      receipts: [],
      usageEvents: [],
      storedEvents: [
        {
          restaurant_id: RESTAURANT_ID,
          agent_id: AGENT,
          conversation_id: "conv_faq_only",
          session_id: "conv_faq_only",
          caller_phone: "+15552223333",
          status: "ended",
          outcome: "no_order",
          started_at: "2026-05-30T17:00:00.000Z",
          ended_at: "2026-05-30T17:02:00.000Z",
          transcript_metadata: { transcript_summary: "Guest asked about hours." },
        },
      ],
      now: NOW,
    });

    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toMatchObject({
      sessionId: "conv_faq_only",
      outcome: "no_order",
      source: "stored",
      transcriptMetadata: { transcript_summary: "Guest asked about hours." },
    });
  });
});
