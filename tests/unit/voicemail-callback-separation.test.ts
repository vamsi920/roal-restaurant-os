import { describe, expect, it } from "vitest";
import { classifyAgentCallOutcome } from "@/lib/agent-calls/classify-outcome";
import { deriveAgentCallSessions } from "@/lib/agent-calls/derive-call-sessions";
import {
  callerContactFromTranscriptMetadata,
  isVoicemailTranscriptMetadata,
  outcomeForVoicemailAwareCall,
} from "@/lib/agent-calls/voicemail-call";
import {
  buildCallHistoryRows,
  followUpReasonFromTranscriptMetadata,
} from "@/lib/call-history/build-call-history-rows";
import {
  handoffSignalsFromTranscript,
  partitionCommandCenterSessions,
} from "@/lib/command-center/partition-command-center";
import { parseElevenLabsPostCallEvent } from "@/lib/elevenlabs/post-call-webhook";
import { buildRecentPhoneOutcomes } from "@/lib/live-orders/build-recent-outcomes";
import { RESTAURANT_ID } from "../fixtures/menu";

const REST_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function fakeSupabase(restaurantId = RESTAURANT_ID) {
  return {
    from() {
      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        async maybeSingle() {
          return { data: { id: restaurantId }, error: null };
        },
      };
    },
  } as never;
}

describe("voicemail transcript detection", () => {
  it("detects voicemail metadata and callback contact when present", () => {
    const metadata = {
      voicemail_detected: true,
      analysis: {
        data_collection_results: {
          caller_name: "Sam Lee",
          callback_phone: "+1 (415) 555-0199",
          callback_reason: "Please call back about catering.",
        },
        transcript_summary: "Guest left a voicemail asking for a callback.",
      },
    };

    expect(isVoicemailTranscriptMetadata(metadata)).toBe(true);
    expect(callerContactFromTranscriptMetadata(metadata)).toEqual({
      callerName: "Sam Lee",
      callerPhone: "+1 (415) 555-0199",
    });
  });

  it("flags voicemail when callback phone is missing", () => {
    const metadata = {
      voicemail_detected: true,
      transcript_summary: "Caller reached voicemail and hung up.",
    };
    expect(isVoicemailTranscriptMetadata(metadata)).toBe(true);
    expect(callerContactFromTranscriptMetadata(metadata)).toEqual({
      callerName: null,
      callerPhone: null,
    });
  });
});

describe("voicemail vs order outcomes", () => {
  it("does not classify voicemail calls as order_completed without a receipt", () => {
    const outcome = classifyAgentCallOutcome({
      draft: null,
      receipt: null,
      usage: [
        {
          event_type: "order_completed",
          occurred_at: "2026-05-30T18:00:00.000Z",
          session_id: "conv_vm",
          metadata: {},
        },
      ],
      transcriptMetadata: { voicemail_detected: true },
      now: new Date("2026-05-30T19:00:00.000Z"),
      abandonedAfterMs: 30 * 60 * 1000,
    });
    expect(outcome).toBe("no_order");
  });

  it("keeps unresolved voicemail post-call events out of order_completed", async () => {
    const parsed = await parseElevenLabsPostCallEvent(
      {
        type: "post_call_transcription",
        event_timestamp: 1_780_164_040,
        data: {
          agent_id: "agent_abc",
          conversation_id: "conv_vm_unresolved",
          metadata: {
            restaurant_id: RESTAURANT_ID,
            termination_reason: "voicemail_detected",
          },
          analysis: {
            call_successful: "success",
            transcript_summary: "Voicemail message about hours.",
            data_collection_results: { voicemail_detected: true },
          },
        },
      },
      fakeSupabase()
    );

    expect(parsed?.outcome).toBe("no_order");
    expect(outcomeForVoicemailAwareCall({
      transcriptMetadata: parsed?.transcriptMetadata ?? {},
      receipt: null,
      inferredOutcome: "order_completed",
    })).toBe("no_order");
  });

  it("treats unresolved non-voicemail success calls as no_order not billed orders", () => {
    const outcome = classifyAgentCallOutcome({
      draft: null,
      receipt: null,
      usage: [],
      transcriptMetadata: {
        analysis: { call_successful: "success", transcript_summary: "FAQ only." },
      },
      now: new Date("2026-05-30T19:00:00.000Z"),
      abandonedAfterMs: 30 * 60 * 1000,
    });
    expect(outcome).not.toBe("order_completed");
  });
});

describe("call history and command center visibility", () => {
  it("labels voicemail rows separately from orders", () => {
    const rows = buildCallHistoryRows({
      sessions: [
        {
          restaurantId: RESTAURANT_ID,
          sessionId: "conv_vm",
          conversationId: "conv_vm",
          agentId: "agent_1",
          callerPhone: "+14155550199",
          status: "ended",
          outcome: "no_order",
          startedAt: "2026-05-30T17:00:00.000Z",
          endedAt: "2026-05-30T17:05:00.000Z",
          transcriptMetadata: {
            voicemail_detected: true,
            analysis: {
              data_collection_results: {
                caller_name: "Sam Lee",
                callback_phone: "+14155550199",
                callback_reason: "Call me back about a large order.",
              },
            },
          },
          source: "stored",
        },
      ],
      drafts: [],
      receipts: [],
    });

    expect(rows[0]).toMatchObject({
      intent: "voicemail",
      outcome: "no_order",
      callerName: "Sam Lee",
      callerPhone: "+14155550199",
      needsStaffFollowUp: true,
      ownerActionLabel: "Call guest back",
    });
    expect(rows[0]?.outcomeLabel).not.toBe("Order completed");
    expect(rows[0]?.followUpReason).toBe("Voicemail left");
    expect(
      followUpReasonFromTranscriptMetadata({
        voicemail_detected: true,
        analysis: {
          data_collection_results: {
            callback_reason: "Call me back about a large order.",
          },
        },
      })
    ).toBe("Voicemail left");
  });

  it("shows voicemail follow-up in command center and recent outcomes", () => {
    const snap = partitionCommandCenterSessions({
      restaurantId: RESTAURANT_ID,
      restaurantName: "Test",
      linkedAgentId: null,
      rangeSince: "2026-05-30T00:00:00.000Z",
      rangeUntil: "2026-05-30T23:59:59.000Z",
      sessions: [
        {
          restaurantId: RESTAURANT_ID,
          sessionId: "conv_vm_cc",
          conversationId: "conv_vm_cc",
          agentId: "agent_1",
          callerPhone: "+14155550199",
          status: "ended",
          outcome: "no_order",
          startedAt: "2026-05-30T17:00:00.000Z",
          endedAt: "2026-05-30T17:05:00.000Z",
          transcriptMetadata: { voicemail_detected: true },
          source: "stored",
        },
      ],
      usageEvents: [],
      completedOrders: [],
    });

    expect(snap.handoffCalls).toHaveLength(1);
    expect(handoffSignalsFromTranscript({ voicemail_detected: true })).toContain(
      "voicemail_detected"
    );

    const outcomes = buildRecentPhoneOutcomes({
      failed: [],
      handoff: snap.handoffCalls,
      unknown: [],
    });
    expect(outcomes[0]?.kind).toBe("voicemail");
    expect(outcomes[0]?.headline).toBe("Voicemail callback");
  });
});

describe("tenant isolation for voicemail sessions", () => {
  it("scopes derived voicemail sessions to the requested restaurant", () => {
    const sessions = deriveAgentCallSessions({
      restaurantId: RESTAURANT_ID,
      linkedAgentId: "agent_1",
      drafts: [],
      receipts: [
        {
          restaurant_id: REST_B,
          session_id: "foreign_vm",
          customer_name: "Wrong",
          customer_phone: "+15550009999",
          items: [{ name: "Burger", quantity: 1 }],
          created_at: "2026-05-30T18:00:00.000Z",
        },
      ],
      usageEvents: [],
      storedEvents: [
        {
          restaurant_id: RESTAURANT_ID,
          session_id: "local_vm",
          conversation_id: "local_vm",
          agent_id: "agent_1",
          caller_phone: "+14155550111",
          status: "ended",
          outcome: "no_order",
          started_at: "2026-05-30T17:00:00.000Z",
          ended_at: "2026-05-30T17:05:00.000Z",
          transcript_metadata: { voicemail_detected: true },
        },
      ],
    });

    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.sessionId).toBe("local_vm");
    expect(sessions[0]?.restaurantId).toBe(RESTAURANT_ID);
    expect(sessions[0]?.outcome).toBe("no_order");
  });
});
