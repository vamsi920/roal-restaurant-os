import crypto from "crypto";
import { describe, expect, it } from "vitest";
import {
  parseElevenLabsPostCallEvent,
  staffHandoffReasonFromTranscriptMetadata,
  verifyElevenLabsWebhookSignature,
} from "@/lib/elevenlabs/post-call-webhook";

const RESTAURANT_ID = "11111111-1111-4111-8111-111111111111";

function fakeSupabase() {
  return {
    from(table: string) {
      return {
        select() {
          return this;
        },
        eq(column: string, value: string) {
          expect(table).toBe("restaurants");
          expect(column).toBe("id");
          expect(value).toBe(RESTAURANT_ID);
          return this;
        },
        async maybeSingle() {
          return { data: { id: RESTAURANT_ID }, error: null };
        },
      };
    },
  } as never;
}

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
      fakeSupabase()
    );

    expect(parsed).toMatchObject({
      restaurantId: RESTAURANT_ID,
      agentId: "agent_abc",
      conversationId: "conv_123",
      sessionId: "conv_123",
      callerPhone: "+15551234567",
      status: "ended",
      outcome: "order_completed",
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
      fakeSupabase()
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
      fakeSupabase()
    );

    expect(parsed?.transcriptMetadata).toMatchObject({
      voicemail_detected: true,
      voicemail_source: "voicemail_detected",
    });
    expect(
      staffHandoffReasonFromTranscriptMetadata(parsed?.transcriptMetadata ?? {})
    ).toBe("voicemail_detected");
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
