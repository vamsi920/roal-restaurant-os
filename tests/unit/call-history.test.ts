import { describe, expect, it } from "vitest";
import {
  buildCallHistoryRows,
  buildCallHistorySummary,
  filterCallHistoryRows,
  followUpReasonFromTranscriptMetadata,
  recordingUrlFromTranscriptMetadata,
  transcriptLinesFromMetadata,
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

  it("shows fulfillment label without leaking delivery address", () => {
    const rows = buildCallHistoryRows({
      restaurantId: RESTAURANT_ID,
      sessions: [session({ sessionId: "conv_delivery" })],
      drafts: [],
      receipts: [
        {
          restaurant_id: RESTAURANT_ID,
          session_id: "conv_delivery",
          customer_name: "Sam",
          customer_phone: "+15551234567",
          fulfillment_type: "delivery",
          delivery_address: "742 Secret Lane, Other City",
          items: [{ name: "Burger", quantity: 1, customizations: [] }],
          created_at: "2026-05-30T17:15:00.000Z",
        },
      ],
    });
    expect(rows[0]?.fulfillmentLabel).toBe("Delivery");
    expect(JSON.stringify(rows[0])).not.toContain("742 Secret Lane");
  });

  it("scopes fulfillment rows to the restaurant id", () => {
    const rows = buildCallHistoryRows({
      restaurantId: RESTAURANT_ID,
      sessions: [session({ sessionId: "conv_local" })],
      drafts: [],
      receipts: [
        {
          restaurant_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          session_id: "conv_local",
          customer_name: "Foreign",
          customer_phone: null,
          fulfillment_type: "delivery",
          delivery_address: "999 Foreign Ave",
          items: [{ name: "Pie", quantity: 1, customizations: [] }],
          created_at: "2026-05-30T17:15:00.000Z",
        },
      ],
    });
    expect(rows[0]?.fulfillmentLabel).toBeNull();
    expect(JSON.stringify(rows[0])).not.toContain("999 Foreign Ave");
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

  it("surfaces staff follow-up metadata for handoff inboxes", () => {
    const rows = buildCallHistoryRows({
      sessions: [
        session({
          sessionId: "handoff",
          outcome: "no_order",
          transcriptMetadata: {
            manager_requested: true,
            transcript_summary: "Guest wants a manager callback about catering.",
            recording_url: "https://audio.example.com/handoff.mp3",
            call_duration_secs: "72",
          },
        }),
      ],
      drafts: [],
      receipts: [],
    });

    expect(rows[0]).toMatchObject({
      needsStaffFollowUp: true,
      followUpReason: "Manager requested",
      transcriptSummary: "Guest wants a manager callback about catering.",
      recordingUrl: "https://audio.example.com/handoff.mp3",
      durationSeconds: 72,
    });
  });

  it("classifies reservation sessions and owner actions", () => {
    const rows = buildCallHistoryRows({
      sessions: [
        session({
          sessionId: "reservation-call",
          outcome: "no_order",
          transcriptMetadata: {
            transcript_summary: "Guest asked to book a table for four tonight.",
          },
        }),
      ],
      drafts: [],
      receipts: [],
      reservationSessionIds: ["reservation-call"],
    });

    expect(rows[0]).toMatchObject({
      intent: "reservation",
      intentLabel: "Reservation",
      ownerActionLabel: "Review table request",
      isActionable: true,
    });
  });

  it("links reservation request status to session owner action", () => {
    const rows = buildCallHistoryRows({
      sessions: [
        session({
          sessionId: "reservation-call",
          outcome: "no_order",
        }),
      ],
      drafts: [],
      receipts: [],
      reservationSessionIds: ["reservation-call"],
      reservationBySession: new Map([
        ["reservation-call", { status: "contacted" }],
      ]),
    });

    expect(rows[0]?.ownerActionLabel).toMatch(/Confirm table or decline/i);
    expect(rows[0]?.isActionable).toBe(true);
  });

  it("surfaces caller language from post-call metadata", () => {
    const rows = buildCallHistoryRows({
      sessions: [
        session({
          sessionId: "spanish-call",
          transcriptMetadata: {
            caller_language: "es",
            transcript_summary: "Guest ordered pickup in Spanish.",
          },
        }),
      ],
      drafts: [],
      receipts: [
        {
          restaurant_id: RESTAURANT_ID,
          session_id: "spanish-call",
          customer_name: "Maria",
          customer_phone: "+15551234567",
          items: [{ name: "Classic Burger", quantity: 1, customizations: [] }],
          created_at: "2026-05-30T17:15:00.000Z",
        },
      ],
    });

    expect(rows[0]?.callerLanguageLabel).toBe("Spanish");
  });

  it("classifies menu and info calls from transcript text", () => {
    const rows = buildCallHistoryRows({
      sessions: [
        session({
          sessionId: "faq-call",
          outcome: "no_order",
          transcriptMetadata: {
            transcript_summary: "Guest asked for hours and allergen details.",
          },
        }),
      ],
      drafts: [],
      receipts: [],
    });

    expect(rows[0]).toMatchObject({
      intent: "faq",
      intentLabel: "Menu or info",
      ownerActionLabel: "Answered from restaurant info",
      isActionable: false,
    });
  });

  it("classifies pickup order status inquiries as info, not orders", () => {
    const rows = buildCallHistoryRows({
      sessions: [
        session({
          sessionId: "status-call",
          outcome: "no_order",
          transcriptMetadata: {
            transcript_summary:
              "Guest asked if their pickup order is ready and gave a phone number.",
          },
        }),
      ],
      drafts: [
        {
          restaurant_id: RESTAURANT_ID,
          session_id: "status-call",
          status: "draft",
          items: [{ name: "Burger", quantity: 1 }],
          customer_name: "Sam",
          customer_phone: "+15551234567",
          created_at: "2026-05-30T17:00:00.000Z",
          updated_at: "2026-05-30T17:05:00.000Z",
          completed_at: null,
          canceled_at: null,
        },
      ],
      receipts: [],
    });

    expect(rows[0]).toMatchObject({
      intent: "faq",
      intentLabel: "Menu or info",
      lineCount: 1,
      ownerActionLabel: "Answered from restaurant info",
    });
  });

  it("surfaces sanitized transcript lines from webhook metadata", () => {
    const rows = buildCallHistoryRows({
      sessions: [
        session({
          sessionId: "transcript",
          transcriptMetadata: {
            transcript_summary: "Guest ordered a burger.",
            transcript: [
              { role: "agent", message: "Thanks for calling. What can I get you?" },
              { role: "user", message: "One burger for pickup." },
              { role: "tool", tool_calls: [{ name: "finalize_order" }] },
            ],
          },
        }),
      ],
      drafts: [],
      receipts: [],
    });

    expect(rows[0]?.transcriptLines).toEqual([
      {
        speaker: "Agent",
        text: "Thanks for calling. What can I get you?",
      },
      { speaker: "Guest", text: "One burger for pickup." },
    ]);
  });

  it("surfaces voicemail calls in the staff follow-up inbox", () => {
    const rows = buildCallHistoryRows({
      sessions: [
        session({
          sessionId: "voicemail",
          outcome: "no_order",
          transcriptMetadata: {
            voicemail_detected: true,
            transcript_summary: "Guest left a voicemail asking for a callback.",
            audio_url: "https://audio.example.com/voicemail.mp3",
          },
        }),
      ],
      drafts: [],
      receipts: [],
    });

    expect(rows[0]).toMatchObject({
      intent: "voicemail",
      intentLabel: "Voicemail",
      ownerActionLabel: "Call guest back",
      isActionable: true,
      needsStaffFollowUp: true,
      followUpReason: "Voicemail left",
      transcriptSummary: "Guest left a voicemail asking for a callback.",
      recordingUrl: "https://audio.example.com/voicemail.mp3",
    });
  });

  it("detects voicemail from post-call summaries when no explicit flag is present", () => {
    const rows = buildCallHistoryRows({
      sessions: [
        session({
          sessionId: "voicemail-summary",
          outcome: "no_order",
          transcriptMetadata: {
            call_intent: "message_left",
            transcript_summary: "Guest left a message for the restaurant: call me back tonight.",
          },
        }),
      ],
      drafts: [],
      receipts: [],
    });

    expect(rows[0]).toMatchObject({
      intent: "voicemail",
      followUpReason: "Voicemail left",
      ownerActionLabel: "Call guest back",
    });
  });
});

describe("followUpReasonFromTranscriptMetadata", () => {
  it("maps handoff flags to owner-readable labels", () => {
    expect(
      followUpReasonFromTranscriptMetadata({ voicemail_detected: "true" })
    ).toBe("Voicemail left");
    expect(
      followUpReasonFromTranscriptMetadata({ callback_requested: "true" })
    ).toBe("Callback requested");
    expect(
      followUpReasonFromTranscriptMetadata({ escalation_requested: true })
    ).toBe("Escalation requested");
  });

  it("ignores ordinary call summaries", () => {
    expect(
      followUpReasonFromTranscriptMetadata({
        transcript_summary: "Guest asked for restaurant hours.",
      })
    ).toBeNull();
  });
});

describe("recordingUrlFromTranscriptMetadata", () => {
  it("accepts safe recording URLs", () => {
    expect(
      recordingUrlFromTranscriptMetadata({
        recording_url: "https://audio.example.com/call.mp3",
      })
    ).toBe("https://audio.example.com/call.mp3");
  });

  it("falls back to audio_url and rejects unsafe schemes", () => {
    expect(
      recordingUrlFromTranscriptMetadata({
        recording_url: "javascript:alert(1)",
        audio_url: "http://audio.example.com/call.wav",
      })
    ).toBe("http://audio.example.com/call.wav");
  });
});

describe("transcriptLinesFromMetadata", () => {
  it("limits transcript lines and supports alternate text fields", () => {
    const lines = transcriptLinesFromMetadata(
      {
        transcript: [
          { speaker: "customer", text: "Hello" },
          { role: "assistant", content: "Hi" },
          { role: "system", message: "Internal note" },
        ],
      },
      2
    );

    expect(lines).toEqual([
      { speaker: "Guest", text: "Hello" },
      { speaker: "Agent", text: "Hi" },
    ]);
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
      session({
        sessionId: "d",
        outcome: "no_order",
        transcriptMetadata: { voicemail_detected: true },
      }),
    ],
    drafts: [],
    receipts: [],
    reservationSessionIds: ["reservation"],
  });

  it("filters completed outcomes", () => {
    expect(filterCallHistoryRows(rows, "completed")).toHaveLength(1);
  });

  it("filters failed outcomes", () => {
    expect(filterCallHistoryRows(rows, "failed")).toHaveLength(1);
  });

  it("filters actionable calls", () => {
    expect(filterCallHistoryRows(rows, "needs_action")).toHaveLength(2);
  });

  it("filters voicemail calls", () => {
    const filtered = filterCallHistoryRows(rows, "voicemail");
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.sessionId).toBe("d");
  });
});

describe("call history operational surfaces", () => {
  it("shows active calls from in-progress sessions", () => {
    const rows = buildCallHistoryRows({
      restaurantId: RESTAURANT_ID,
      sessions: [
        session({
          sessionId: "active",
          status: "active",
          outcome: "in_progress",
          endedAt: null,
        }),
      ],
      drafts: [],
      receipts: [],
    });
    expect(rows[0]).toMatchObject({
      outcome: "in_progress",
      intent: "active_call",
      outcomeLabel: "In progress",
    });
    expect(filterCallHistoryRows(rows, "active")).toHaveLength(1);
  });

  it("shows no-order calls without inventing completed orders", () => {
    const rows = buildCallHistoryRows({
      restaurantId: RESTAURANT_ID,
      sessions: [
        session({
          sessionId: "faq",
          outcome: "no_order",
          transcriptMetadata: {
            transcript_summary: "Guest asked about hours only.",
          },
        }),
      ],
      drafts: [],
      receipts: [],
    });
    expect(rows[0]?.outcome).toBe("no_order");
    expect(rows[0]?.lineCount).toBe(0);
    expect(rows[0]?.intent).not.toBe("order");
    expect(filterCallHistoryRows(rows, "completed")).toHaveLength(0);
  });

  it("shows handoff follow-up with recording link when metadata includes URL", () => {
    const rows = buildCallHistoryRows({
      restaurantId: RESTAURANT_ID,
      sessions: [
        session({
          sessionId: "handoff",
          outcome: "no_order",
          transcriptMetadata: {
            callback_requested: true,
            recording_url: "https://audio.example.com/handoff.mp3",
            transcript: [{ role: "guest", message: "Please call me back." }],
          },
        }),
      ],
      drafts: [],
      receipts: [],
    });
    expect(rows[0]).toMatchObject({
      needsStaffFollowUp: true,
      followUpReason: "Callback requested",
      recordingUrl: "https://audio.example.com/handoff.mp3",
    });
    expect(rows[0]?.transcriptLines.length).toBeGreaterThan(0);
    expect(filterCallHistoryRows(rows, "needs_action")).toHaveLength(1);
  });

  it("excludes foreign-tenant receipts from local session rows", () => {
    const rows = buildCallHistoryRows({
      restaurantId: RESTAURANT_ID,
      sessions: [session({ sessionId: "shared_session" })],
      drafts: [],
      receipts: [
        {
          restaurant_id: REST_B,
          session_id: "shared_session",
          customer_name: "Wrong tenant",
          customer_phone: "+15559999999",
          items: [{ name: "Burger", quantity: 9, customizations: [] }],
          created_at: "2026-05-30T17:15:00.000Z",
        },
      ],
    });
    expect(rows[0]?.callerName).not.toBe("Wrong tenant");
    expect(rows[0]?.lineCount).toBe(0);
    expect(rows[0]?.outcome).toBe("order_completed");
  });

  it("shows reservation follow-up intent when session is linked", () => {
    const rows = buildCallHistoryRows({
      restaurantId: RESTAURANT_ID,
      sessions: [
        session({
          sessionId: "reservation-call",
          outcome: "no_order",
        }),
      ],
      drafts: [],
      receipts: [],
      reservationSessionIds: ["reservation-call"],
    });
    expect(rows[0]).toMatchObject({
      intent: "reservation",
      ownerActionLabel: "Review table request",
    });
    expect(filterCallHistoryRows(rows, "reservations")).toHaveLength(1);
  });

  it("reports honest empty summary metrics", () => {
    expect(
      buildCallHistorySummary({ rows: [], openReservationRequests: 0 })
    ).toMatchObject({
      totalCalls: 0,
      activeCalls: 0,
      completedOrders: 0,
      recordingsAvailable: 0,
      transcriptsAvailable: 0,
      orderConversionPercent: null,
    });
  });

  it("marks harness sessions and excludes them from summary metrics", () => {
    const rows = buildCallHistoryRows({
      restaurantId: RESTAURANT_ID,
      sessions: [
        session({
          sessionId: "roal-harness-live",
          status: "active",
          outcome: "in_progress",
          endedAt: null,
        }),
        session({
          sessionId: "conv-live-order",
          outcome: "order_completed",
        }),
      ],
      drafts: [],
      receipts: [
        {
          restaurant_id: RESTAURANT_ID,
          session_id: "conv-live-order",
          customer_name: "Alex",
          customer_phone: "+15551234567",
          items: [{ name: "Burger", quantity: 1, customizations: [] }],
          created_at: "2026-05-30T17:15:00.000Z",
        },
      ],
    });

    expect(rows.find((row) => row.sessionId === "roal-harness-live")).toMatchObject({
      isTestHarness: true,
    });
    expect(
      buildCallHistorySummary({ rows, openReservationRequests: 0 })
    ).toMatchObject({
      totalCalls: 1,
      activeCalls: 0,
      completedOrders: 1,
    });
  });

  it("surfaces catering and complaint follow-ups as needs action", () => {
    const catering = buildCallHistoryRows({
      restaurantId: RESTAURANT_ID,
      sessions: [
        session({
          sessionId: "catering",
          outcome: "no_order",
          transcriptMetadata: { catering_requested: true },
        }),
      ],
      drafts: [],
      receipts: [],
    });
    const complaint = buildCallHistoryRows({
      restaurantId: RESTAURANT_ID,
      sessions: [
        session({
          sessionId: "complaint",
          outcome: "no_order",
          transcriptMetadata: { complaint_requested: true },
        }),
      ],
      drafts: [],
      receipts: [],
    });

    expect(catering[0]).toMatchObject({
      followUpReason: "Catering follow-up",
      isActionable: true,
    });
    expect(complaint[0]).toMatchObject({
      followUpReason: "Complaint follow-up",
      isActionable: true,
    });
    expect(filterCallHistoryRows(catering, "needs_action")).toHaveLength(1);
    expect(filterCallHistoryRows(complaint, "needs_action")).toHaveLength(1);
  });
});

const REST_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("buildCallHistorySummary", () => {
  it("summarizes command center metrics", () => {
    const rows = buildCallHistoryRows({
      restaurantId: RESTAURANT_ID,
      sessions: [
        session({ sessionId: "order", outcome: "order_completed" }),
        session({
          sessionId: "active",
          outcome: "in_progress",
          status: "active",
          endedAt: null,
        }),
        session({
          sessionId: "voicemail",
          outcome: "no_order",
          transcriptMetadata: {
            voicemail_detected: true,
            transcript_summary: "Guest left a voicemail.",
            recording_url: "https://audio.example.com/v.mp3",
          },
        }),
      ],
      drafts: [],
      receipts: [
        {
          restaurant_id: RESTAURANT_ID,
          session_id: "order",
          customer_name: "Alex",
          customer_phone: "+15551234567",
          items: [{ name: "Burger", quantity: 1, customizations: [] }],
          created_at: "2026-05-30T17:15:00.000Z",
        },
      ],
    });

    expect(
      buildCallHistorySummary({ rows, openReservationRequests: 2 })
    ).toMatchObject({
      totalCalls: 3,
      activeCalls: 1,
      completedOrders: 1,
      voicemailCalls: 1,
      openReservationRequests: 2,
      staffFollowUps: 2,
      noOrderCalls: 1,
      recordingsAvailable: 1,
      transcriptsAvailable: 1,
      orderConversionPercent: 50,
    });
  });
});
