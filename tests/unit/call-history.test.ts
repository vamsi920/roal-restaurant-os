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
      ownerActionLabel: "Confirm table with guest",
      isActionable: true,
    });
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

describe("buildCallHistorySummary", () => {
  it("summarizes command center metrics", () => {
    const rows = buildCallHistoryRows({
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
      receipts: [],
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
