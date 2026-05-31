import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildCallHistoryRows,
  followUpReasonFromTranscriptMetadata,
} from "@/lib/call-history/build-call-history-rows";
import {
  handoffSignalsFromTranscript,
  partitionCommandCenterSessions,
} from "@/lib/command-center/partition-command-center";
import {
  classifyHandoffReasonFromSummary,
  mergeHandoffTranscriptFlags,
  staffHandoffReasonFromMetadata,
} from "@/lib/elevenlabs/handoff-metadata";
import {
  parseElevenLabsPostCallEvent,
  staffHandoffReasonFromTranscriptMetadata,
} from "@/lib/elevenlabs/post-call-webhook";
import { buildRestaurantOrderAgentPrompt } from "@/lib/elevenlabs/agent-prompt";
import { isValidStaffCallbackPhone } from "@/lib/restaurant-profile/handoff-rules";
import type { AgentCallSession } from "@/lib/agent-calls/types";

vi.mock("@/lib/notifications/dispatch", () => ({
  dispatchNotification: vi.fn(),
}));

vi.mock("@/lib/observability/audit", () => ({
  writeAuditLog: vi.fn(),
}));

import { dispatchNotification } from "@/lib/notifications/dispatch";
import { emitStaffHandoffRequested } from "@/lib/notifications/operational-events";

const RESTAURANT_ID = "11111111-1111-4111-8111-111111111111";
const REST_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function session(
  partial: Partial<AgentCallSession> & Pick<AgentCallSession, "sessionId">
): AgentCallSession {
  return {
    restaurantId: RESTAURANT_ID,
    sessionId: partial.sessionId,
    conversationId: partial.conversationId ?? partial.sessionId,
    agentId: partial.agentId ?? "agent_1",
    callerPhone: partial.callerPhone ?? null,
    status: partial.status ?? "ended",
    outcome: partial.outcome ?? "no_order",
    startedAt: partial.startedAt ?? "2026-05-30T17:00:00.000Z",
    endedAt: partial.endedAt ?? "2026-05-30T17:10:00.000Z",
    transcriptMetadata: partial.transcriptMetadata ?? {},
    source: partial.source ?? "derived",
  };
}

function restaurantLookupSupabase(validIds: string[]) {
  let requestedId = "";
  return {
    from(table: string) {
      return {
        select() {
          return this;
        },
        eq(column: string, value: string) {
          expect(table).toBe("restaurants");
          expect(column).toBe("id");
          requestedId = value;
          return this;
        },
        async maybeSingle() {
          return {
            data: validIds.includes(requestedId) ? { id: requestedId } : null,
            error: null,
          };
        },
      };
    },
  } as never;
}

describe("handoff metadata classification", () => {
  it("classifies catering and complaint summaries", () => {
    expect(classifyHandoffReasonFromSummary("Need catering for 40 people")).toBe(
      "catering"
    );
    expect(
      classifyHandoffReasonFromSummary("Guest complained the order was wrong")
    ).toBe("complaint");
  });

  it("merges catering and complaint flags from post-call collection", () => {
    const flags = mergeHandoffTranscriptFlags({
      dataCollection: { catering_requested: true },
      analysisSummary: "Guest asked about a large party next week.",
    });
    expect(flags).toMatchObject({
      catering_requested: true,
      handoff_requested: true,
      handoff_reason: "catering",
    });

    const complaintFlags = mergeHandoffTranscriptFlags({
      analysisSummary: "Guest complained about a wrong order and wants a manager.",
    });
    expect(complaintFlags.handoff_requested).toBe(true);
    expect(complaintFlags.handoff_reason).toBe("complaint");
  });
});

describe("staff callback phone validation", () => {
  it("rejects missing and placeholder callback phones", () => {
    expect(isValidStaffCallbackPhone(null)).toBe(false);
    expect(isValidStaffCallbackPhone("")).toBe(false);
    expect(isValidStaffCallbackPhone("555-0100")).toBe(false);
    expect(isValidStaffCallbackPhone("+1 (415) 555-0199")).toBe(true);
  });
});

describe("call history and command center handoff visibility", () => {
  it("surfaces catering handoff in call history without fake confirmations", () => {
    const rows = buildCallHistoryRows({
      sessions: [
        session({
          sessionId: "catering-call",
          transcriptMetadata: {
            catering_requested: true,
            handoff_reason: "catering",
            transcript_summary:
              "Guest asked for catering for 40 guests; agent took callback details.",
          },
        }),
      ],
      drafts: [],
      receipts: [],
    });

    expect(rows[0]).toMatchObject({
      intent: "handoff",
      needsStaffFollowUp: true,
      followUpReason: "Catering follow-up",
      isActionable: true,
    });
    expect(rows[0]?.ownerActionLabel).not.toMatch(/confirmed|booked/i);
  });

  it("routes complaint handoffs to command center bucket with typed signal", () => {
    const snap = partitionCommandCenterSessions({
      restaurantId: RESTAURANT_ID,
      restaurantName: "Test",
      linkedAgentId: null,
      rangeSince: "2026-05-30T00:00:00.000Z",
      rangeUntil: "2026-05-30T23:59:59.000Z",
      sessions: [
        session({
          sessionId: "complaint-call",
          transcriptMetadata: {
            complaint_requested: true,
            handoff_reason: "complaint",
            transcript_summary: "Guest complained about a cold order.",
          },
        }),
      ],
      usageEvents: [],
      completedOrders: [],
    });

    expect(snap.handoffCalls).toHaveLength(1);
    expect(snap.handoffCalls[0]?.handoffSignals).toEqual(
      expect.arrayContaining(["complaint_requested", "complaint"])
    );
  });

  it("maps unavailable-item escalation behavior in the agent prompt", () => {
    const prompt = buildRestaurantOrderAgentPrompt({
      restaurantName: "Test Bistro",
      profile: {
        restaurant_id: RESTAURANT_ID,
        organization_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        timezone: "America/Chicago",
        country: "US",
        allows_pickup: true,
        allows_delivery: false,
        temporarily_closed: false,
        temporarily_closed_reason: null,
        handoff_catering_route: null,
        handoff_complaint_route: null,
        handoff_unavailable_item_behavior: "escalate_to_staff",
        handoff_unavailable_item_notes: "Offer manager callback.",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
      hoursPromptSection: null,
      menu: null,
    });

    expect(prompt).toMatch(/offer staff callback using manager contact/i);
    expect(prompt).toContain("Offer manager callback.");
    expect(prompt).toMatch(/Never tell the guest catering is booked/i);
    expect(prompt).toMatch(/collect their real name, callback phone/i);
  });
});

describe("post-call tenant isolation", () => {
  it("does not persist events for unknown restaurant ids", async () => {
    const parsed = await parseElevenLabsPostCallEvent(
      {
        type: "post_call_transcription",
        data: {
          conversation_id: "conv_foreign",
          conversation_initiation_client_data: {
            dynamic_variables: { restaurant_id: REST_B },
          },
        },
      },
      restaurantLookupSupabase([RESTAURANT_ID])
    );

    expect(parsed).toBeNull();
  });

  it("stores complaint handoff flags for the scoped restaurant", async () => {
    const parsed = await parseElevenLabsPostCallEvent(
      {
        type: "post_call_transcription",
        data: {
          agent_id: "agent_abc",
          conversation_id: "conv_complaint",
          metadata: { restaurant_id: RESTAURANT_ID },
          analysis: {
            transcript_summary: "Guest complained and asked for a manager callback.",
            data_collection_results: { complaint_requested: true },
          },
        },
      },
      restaurantLookupSupabase([RESTAURANT_ID])
    );

    expect(parsed?.restaurantId).toBe(RESTAURANT_ID);
    expect(parsed?.transcriptMetadata).toMatchObject({
      complaint_requested: true,
      handoff_requested: true,
      handoff_reason: "complaint",
    });
    expect(
      staffHandoffReasonFromTranscriptMetadata(parsed?.transcriptMetadata ?? {})
    ).toBe("complaint_requested");
    expect(
      followUpReasonFromTranscriptMetadata(parsed?.transcriptMetadata ?? {})
    ).toBe("Complaint follow-up");
    expect(staffHandoffReasonFromMetadata(parsed?.transcriptMetadata ?? {})).toBe(
      "complaint_requested"
    );
  });
});

describe("emitStaffHandoffRequested wording", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(dispatchNotification).mockResolvedValue(true);
  });

  it("does not imply a captured callback phone when missing", async () => {
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: RESTAURANT_ID,
                name: "Test Bistro",
                organization_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
              },
              error: null,
            }),
          }),
        }),
      }),
    };

    await emitStaffHandoffRequested(supabase as never, {
      restaurantId: RESTAURANT_ID,
      sessionId: "conv_handoff",
      callerPhone: null,
      reason: "catering",
      summary: "Guest asked for catering for 30 guests.",
    });

    expect(dispatchNotification).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        body: expect.stringMatching(/callback number was not captured/i),
      })
    );
    expect(dispatchNotification).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        body: expect.not.stringMatching(/confirmed|booked/i),
      })
    );
  });
});
