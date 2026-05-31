import { NextResponse } from "next/server";
import { getElevenLabsWebhookSecret } from "@/lib/env.server";
import {
  ELEVENLABS_WEBHOOK_SIGNATURE_HEADER,
  persistElevenLabsPostCallEvent,
  verifyElevenLabsWebhookSignature,
  type ElevenLabsPostCallEvent,
} from "@/lib/elevenlabs/post-call-webhook";

export const runtime = "nodejs";

const SUPPORTED_EVENTS = new Set([
  "post_call_transcription",
  "post_call_audio",
  "call_initiation_failure",
]);

export async function POST(req: Request) {
  const secret = getElevenLabsWebhookSecret()?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: "ELEVENLABS_WEBHOOK_SECRET is required" },
      { status: 503 }
    );
  }

  const rawBody = await req.text();
  const signatureHeader = req.headers.get(ELEVENLABS_WEBHOOK_SIGNATURE_HEADER);
  const ok = verifyElevenLabsWebhookSignature({
    rawBody,
    signatureHeader,
    secret,
  });
  if (!ok) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: ElevenLabsPostCallEvent;
  try {
    event = JSON.parse(rawBody) as ElevenLabsPostCallEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!SUPPORTED_EVENTS.has(event.type)) {
    return NextResponse.json({ received: true, ignored: true });
  }

  try {
    const result = await persistElevenLabsPostCallEvent(event);
    return NextResponse.json({
      received: true,
      stored: result.stored,
      reason: result.reason ?? null,
      conversation_id: result.parsed?.conversationId ?? null,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to store post-call event" },
      { status: 500 }
    );
  }
}
