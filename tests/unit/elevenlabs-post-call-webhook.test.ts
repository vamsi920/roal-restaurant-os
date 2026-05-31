import crypto from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  parseElevenLabsPostCallEvent,
  persistElevenLabsPostCallEvent,
  staffHandoffReasonFromTranscriptMetadata,
  verifyElevenLabsWebhookSignature,
} from "@/lib/elevenlabs/post-call-webhook";

vi.mock("@/lib/elevenlabs/conversation-init", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/elevenlabs/conversation-init")>();
  return {
    ...actual,
    lookupRestaurantForElevenLabsAgent: vi.fn(),
    lookupRestaurantByCalledNumber: vi.fn(),
  };
});

vi.mock("@/lib/supabase/server", () => ({
  getServiceRoleSupabase: vi.fn(),
}));

vi.mock("@/lib/notifications/call-follow-up-events", () => ({
  emitPostCallFollowUpNotifications: vi.fn().mockResolvedValue(undefined),
}));

import {
  lookupRestaurantByCalledNumber,
  lookupRestaurantForElevenLabsAgent,
} from "@/lib/elevenlabs/conversation-init";
import { getServiceRoleSupabase } from "@/lib/supabase/server";
import { emitPostCallFollowUpNotifications } from "@/lib/notifications/call-follow-up-events";

const RESTAURANT_ID = "11111111-1111-4111-8111-111111111111";
const REST_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

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

function persistSupabase(input?: {
  validRestaurantIds?: string[];
  existingRef?: { current: Record<string, unknown> | null };
}) {
  const validRestaurantIds = input?.validRestaurantIds ?? [RESTAURANT_ID];
  const existingRef = input?.existingRef ?? { current: null };
  const upsert = vi.fn((row: { transcript_metadata: Record<string, unknown> }) => {
    existingRef.current = row.transcript_metadata;
    return Promise.resolve({ error: null });
  });

  return {
    from(table: string) {
      if (table === "restaurants") {
        return restaurantLookupSupabase(validRestaurantIds).from(table);
      }
      if (table === "agent_call_events") {
        const chain = {
          select() {
            return chain;
          },
          eq() {
            return chain;
          },
          async maybeSingle() {
            return {
              data: existingRef.current
                ? { transcript_metadata: existingRef.current }
                : null,
              error: null,
            };
          },
          upsert,
        };
        return chain;
      }
      throw new Error(`unexpected table ${table}`);
    },
    upsert,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(lookupRestaurantForElevenLabsAgent).mockResolvedValue(null);
  vi.mocked(lookupRestaurantByCalledNumber).mockResolvedValue(null);
});

function sign(rawBody: string, secret: string, timestamp: number): string {
  const digest = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
  return `t=${timestamp},v0=${digest}`;
}

describe("verifyElevenLabsWebhookSignature", () => {
  it("accepts current HMAC signatures", () => {
    const rawBody = JSON.stringify({ type: "post_call_transcription" });
    const secret = "whsec_test";
    const now = 1_777_000_000;
    expect(
      verifyElevenLabsWebhookSignature({
        rawBody,
        secret,
        signatureHeader: sign(rawBody, secret, now),
        nowSeconds: now,
      })
    ).toBe(true);
  });

  it("rejects stale signatures", () => {
    const rawBody = JSON.stringify({ type: "post_call_transcription" });
    const secret = "whsec_test";
    expect(
      verifyElevenLabsWebhookSignature({
        rawBody,
        secret,
        signatureHeader: sign(rawBody, secret, 1_777_000_000),
        nowSeconds: 1_777_002_000,
      })
    ).toBe(false);
  });
});

describe("parseElevenLabsPostCallEvent", () => {
  it("maps transcription webhook payload into a stored call event", async () => {
    const parsed = await parseElevenLabsPostCallEvent(
      {
        type: "post_call_transcription",
        event_timestamp: 1_780_164_040,
        data: {
          agent_id: "agent_abc",
          conversation_id: "conv_123",
          transcript: [
            {
              role: "agent",
              message: "I can take your order.",
              tool_calls: [{ name: "finalize_order" }],
              tool_results: [{ name: "finalize_order", result: "ok" }],
            },
          ],
          metadata: {
            start_time_unix_secs: 1_780_164_000,
            call_duration_secs: 40,
            recording_url: "https://audio.example.com/conv_123.mp3",
            phone_call: { caller_id: "+15551234567" },
          },
          analysis: {
            call_successful: "success",
            transcript_summary: "Guest ordered pickup and asked for a manager callback.",
            data_collection_results: { callback_requested: true },
          },
          conversation_initiation_client_data: {
            dynamic_variables: { restaurant_id: RESTAURANT_ID },
          },
        },
      },
      restaurantLookupSupabase([RESTAURANT_ID])
    );

    expect(parsed).toMatchObject({
      restaurantId: RESTAURANT_ID,
      agentId: "agent_abc",
      conversationId: "conv_123",
      sessionId: "conv_123",
      callerPhone: "+15551234567",
      status: "ended",
      outcome: "no_order",
      startedAt: "2026-05-30T18:00:00.000Z",
      endedAt: "2026-05-30T18:00:40.000Z",
    });
    expect(parsed?.transcriptMetadata).toMatchObject({
      event_type: "post_call_transcription",
      transcript_summary: "Guest ordered pickup and asked for a manager callback.",
      call_duration_secs: 40,
      recording_url: "https://audio.example.com/conv_123.mp3",
      callback_requested: true,
      handoff_requested: true,
    });
  });

  it("maps call initiation failures to abandoned outcomes", async () => {
    const parsed = await parseElevenLabsPostCallEvent(
      {
        type: "call_initiation_failure",
        event_timestamp: 1_780_164_040,
        data: {
          agent_id: "agent_abc",
          conversation_id: "conv_failed",
          failure_reason: "busy",
          metadata: {
            restaurant_id: RESTAURANT_ID,
            type: "twilio",
            body: { From: "+15557654321" },
          },
        },
      },
      restaurantLookupSupabase([RESTAURANT_ID])
    );

    expect(parsed).toMatchObject({
      conversationId: "conv_failed",
      callerPhone: "+15557654321",
      outcome: "abandoned",
      status: "ended",
    });
    expect(parsed?.transcriptMetadata).toMatchObject({
      event_type: "call_initiation_failure",
    });
  });

  it("flags voicemail calls for staff follow-up", async () => {
    const parsed = await parseElevenLabsPostCallEvent(
      {
        type: "post_call_transcription",
        event_timestamp: 1_780_164_040,
        data: {
          agent_id: "agent_abc",
          conversation_id: "conv_voicemail",
          metadata: {
            restaurant_id: RESTAURANT_ID,
            call_duration_secs: 18,
            termination_reason: "voicemail_detected",
          },
          analysis: {
            call_successful: "success",
            transcript_summary: "Caller reached voicemail and left a short message.",
            data_collection_results: { voicemail_detected: true },
          },
        },
      },
      restaurantLookupSupabase([RESTAURANT_ID])
    );

    expect(parsed?.outcome).toBe("no_order");
    expect(parsed?.transcriptMetadata).toMatchObject({
      voicemail_detected: true,
      voicemail_source: "voicemail_detected",
      recording_url: null,
    });
    expect(
      staffHandoffReasonFromTranscriptMetadata(parsed?.transcriptMetadata ?? {})
    ).toBe("voicemail_detected");
  });

  it("does not invent order_completed from transcript finalize tool mentions alone", async () => {
    const parsed = await parseElevenLabsPostCallEvent(
      {
        type: "post_call_transcription",
        data: {
          conversation_id: "conv_transcript_only",
          metadata: { restaurant_id: RESTAURANT_ID },
          transcript: [
            {
              role: "agent",
              tool_calls: [{ name: "finalize_order" }],
              tool_results: [{ name: "finalize_order", result: "ok" }],
            },
          ],
          analysis: { call_successful: "success" },
        },
      },
      restaurantLookupSupabase([RESTAURANT_ID])
    );

    expect(parsed?.outcome).toBe("no_order");
    expect(parsed?.sessionId).toBe("conv_transcript_only");
  });

  it("persists recording URL and transcript on the webhook payload", async () => {
    const parsed = await parseElevenLabsPostCallEvent(
      {
        type: "post_call_transcription",
        data: {
          conversation_id: "conv_recording",
          metadata: {
            restaurant_id: RESTAURANT_ID,
            recording_url: "https://cdn.example.com/recording.mp3",
          },
          transcript: [{ role: "agent", message: "Thanks for calling." }],
          analysis: { call_successful: "success", transcript_summary: "FAQ call." },
        },
      },
      restaurantLookupSupabase([RESTAURANT_ID])
    );

    expect(parsed?.transcriptMetadata).toMatchObject({
      recording_url: "https://cdn.example.com/recording.mp3",
      transcript_summary: "FAQ call.",
    });
    expect(parsed?.transcriptMetadata.transcript).toHaveLength(1);
  });

  it("resolves restaurant via called_number when payload restaurant id is absent", async () => {
    vi.mocked(lookupRestaurantByCalledNumber).mockResolvedValue({
      restaurantId: RESTAURANT_ID,
      restaurantName: "Test Bistro",
      linkedAgentId: "agent_linked",
    });

    const parsed = await parseElevenLabsPostCallEvent(
      {
        type: "post_call_transcription",
        data: {
          agent_id: "unknown_agent",
          conversation_id: "conv_called_number",
          metadata: {
            called_number: "+1 (555) 010-0200",
            phone_call: { caller_id: "(415) 555-0199" },
          },
          analysis: { call_successful: "success" },
        },
      },
      restaurantLookupSupabase([RESTAURANT_ID])
    );

    expect(lookupRestaurantByCalledNumber).toHaveBeenCalledWith("+1 (555) 010-0200");
    expect(parsed).toMatchObject({
      restaurantId: RESTAURANT_ID,
      conversationId: "conv_called_number",
      sessionId: "conv_called_number",
      callerPhone: "+14155550199",
    });
    expect(parsed?.transcriptMetadata.called_number).toBe("+1 (555) 010-0200");
  });

  it("ignores events when restaurant id is unknown", async () => {
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

  it("ignores events when agent and called_number cannot be mapped", async () => {
    const parsed = await parseElevenLabsPostCallEvent(
      {
        type: "post_call_transcription",
        data: {
          agent_id: "agent_unknown",
          conversation_id: "conv_unmapped",
          analysis: { call_successful: "success" },
        },
      },
      restaurantLookupSupabase([RESTAURANT_ID])
    );

    expect(parsed).toBeNull();
    expect(lookupRestaurantForElevenLabsAgent).toHaveBeenCalledWith("agent_unknown");
  });
});

describe("persistElevenLabsPostCallEvent", () => {
  const handoffEvent = {
    type: "post_call_transcription",
    data: {
      conversation_id: "conv_dup",
      metadata: { restaurant_id: RESTAURANT_ID },
      analysis: {
        call_successful: "success",
        transcript_summary: "Guest asked for a manager.",
        data_collection_results: { manager_requested: true },
      },
    },
  };

  it("upserts idempotently and emits staff handoff only once per reason", async () => {
    const existingRef = { current: null as Record<string, unknown> | null };
    const supabase = persistSupabase({ existingRef });
    vi.mocked(getServiceRoleSupabase).mockReturnValue(supabase as never);

    const first = await persistElevenLabsPostCallEvent(handoffEvent);
    expect(first.stored).toBe(true);
    const second = await persistElevenLabsPostCallEvent(handoffEvent);

    expect(first.stored).toBe(true);
    expect(second.stored).toBe(true);
    expect(supabase.upsert).toHaveBeenCalledTimes(2);
    expect(emitPostCallFollowUpNotifications).toHaveBeenCalledTimes(1);
    expect(supabase.upsert.mock.calls[1]?.[0]).toMatchObject({
      restaurant_id: RESTAURANT_ID,
      session_id: "conv_dup",
      conversation_id: "conv_dup",
    });
  });

  it("merges recording URL on a duplicate webhook without dropping transcript", async () => {
    const supabase = persistSupabase({
      existingRef: {
        current: {
          event_type: "post_call_transcription",
          transcript: [{ role: "agent", message: "Hello." }],
          transcript_summary: "FAQ call.",
        },
      },
    });
    vi.mocked(getServiceRoleSupabase).mockReturnValue(supabase as never);

    await persistElevenLabsPostCallEvent({
      type: "post_call_transcription",
      data: {
        conversation_id: "conv_merge",
        metadata: {
          restaurant_id: RESTAURANT_ID,
          recording_url: "https://cdn.example.com/late-recording.mp3",
        },
        analysis: { call_successful: "success" },
      },
    });

    const row = supabase.upsert.mock.calls[0]?.[0] as {
      transcript_metadata: Record<string, unknown>;
    };
    expect(row.transcript_metadata.recording_url).toBe(
      "https://cdn.example.com/late-recording.mp3"
    );
    expect(row.transcript_metadata.transcript).toEqual([
      { role: "agent", message: "Hello." },
    ]);
  });

  it("returns unresolved when restaurant linkage cannot be established", async () => {
    vi.mocked(getServiceRoleSupabase).mockReturnValue(
      persistSupabase({ validRestaurantIds: [RESTAURANT_ID] }) as never
    );

    const result = await persistElevenLabsPostCallEvent({
      type: "post_call_transcription",
      data: {
        conversation_id: "conv_missing",
        metadata: { restaurant_id: REST_B },
      },
    });

    expect(result).toEqual({ stored: false, reason: "unresolved_event" });
    expect(emitPostCallFollowUpNotifications).not.toHaveBeenCalled();
  });
});

describe("staffHandoffReasonFromTranscriptMetadata", () => {
  it("returns the first stored handoff reason", () => {
    expect(
      staffHandoffReasonFromTranscriptMetadata({
        callback_requested: true,
        manager_requested: true,
      })
    ).toBe("manager_requested");
  });

  it("ignores calls without explicit handoff flags", () => {
    expect(
      staffHandoffReasonFromTranscriptMetadata({
        transcript_summary: "Guest placed a normal pickup order.",
      })
    ).toBeNull();
  });
});
