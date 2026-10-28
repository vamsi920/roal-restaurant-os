import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getServerEnv } from "@/lib/env.server";
import { verifyStripeWebhook } from "@/lib/billing/stripe";
import { handleStripeEvent } from "@/lib/billing/stripe-webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Payment events: start or stop an organization's plan; an active plan gets its phone lines. */
export async function POST(req: Request) {
  const secret = getServerEnv().STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) return NextResponse.json({ error: "Not configured." }, { status: 503 });

  const rawBody = await req.text();
  const event = verifyStripeWebhook(rawBody, req.headers.get("stripe-signature"), secret);
  if (!event) return NextResponse.json({ error: "Invalid signature." }, { status: 400 });

  try {
    const outcome = await handleStripeEvent(getDb(), event);
    return NextResponse.json({ received: true, ...outcome });
  } catch (e) {
    console.error("[billing webhook]", event.type, e instanceof Error ? e.message : e);
    // 500 makes Stripe retry; every step is idempotent.
    return NextResponse.json({ error: "Processing failed." }, { status: 500 });
  }
}
