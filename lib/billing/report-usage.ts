import type { Db } from "@/lib/db";
import {
  billableReceiptSessionKey,
  isBillablePhoneOrderReceipt,
  type BillableReceiptRow,
} from "@/lib/billing/billable-orders";
import { getStripeClient } from "@/lib/billing/provider";
import { ORDER_METER_EVENT_NAME, type FetchFn, type StripeClient } from "@/lib/billing/stripe";

/**
 * Report one completed phone order to the $0.90/order meter. Only orders from organizations
 * with an active plan are billed (trial and demo orders are free). The meter event identifier
 * is the receipt key, so a retry never bills the same order twice, and the receipt is stamped
 * `usage_reported_at` once Stripe accepts it.
 */

export type ReportUsageResult =
  | { reported: true }
  | { reported: false; reason: "not_billable" | "already_reported" | "no_plan" | "not_configured" | "failed" };

export async function reportCompletedOrderUsage(
  db: Db,
  input: { restaurantId: string; sessionId: string },
  deps: { stripe?: StripeClient | null; fetchImpl?: FetchFn } = {}
): Promise<ReportUsageResult> {
  const stripe = deps.stripe !== undefined ? deps.stripe : getStripeClient(deps.fetchImpl);
  if (!stripe) return { reported: false, reason: "not_configured" };

  const { data: receipt } = await db
    .from("phone_order_receipts")
    .select("id, restaurant_id, session_id, items, created_at, usage_reported_at")
    .eq("restaurant_id", input.restaurantId)
    .eq("session_id", input.sessionId)
    .maybeSingle<BillableReceiptRow & { id: string; usage_reported_at?: string | null }>();
  if (!receipt || !isBillablePhoneOrderReceipt(receipt)) return { reported: false, reason: "not_billable" };
  if (receipt.usage_reported_at) return { reported: false, reason: "already_reported" };

  const { data: restaurant } = await db
    .from("restaurants")
    .select("organization_id")
    .eq("id", input.restaurantId)
    .maybeSingle<{ organization_id: string | null }>();
  if (!restaurant?.organization_id) return { reported: false, reason: "no_plan" };
  const { data: org } = await db
    .from("organizations")
    .select("subscription_status, stripe_customer_id")
    .eq("id", restaurant.organization_id)
    .maybeSingle<{ subscription_status: string | null; stripe_customer_id: string | null }>();
  const customer = org?.stripe_customer_id?.trim();
  if (org?.subscription_status !== "active" || !customer) return { reported: false, reason: "no_plan" };

  const createdMs = Date.parse(receipt.created_at);
  try {
    await stripe.post(
      "/billing/meter_events",
      {
        event_name: ORDER_METER_EVENT_NAME,
        identifier: billableReceiptSessionKey(input.restaurantId, input.sessionId),
        timestamp: Math.floor((Number.isFinite(createdMs) ? createdMs : Date.now()) / 1000),
        payload: { stripe_customer_id: customer, value: 1 },
      },
      { timeoutMs: 4000 }
    );
  } catch (e) {
    console.error("[billing] usage report", input.restaurantId, e instanceof Error ? e.message : e);
    return { reported: false, reason: "failed" };
  }

  await db
    .from("phone_order_receipts")
    .update({ usage_reported_at: new Date().toISOString() })
    .eq("restaurant_id", input.restaurantId)
    .eq("session_id", input.sessionId);
  return { reported: true };
}

/** Stripe only accepts meter events up to 35 days old; stay inside that with a margin. */
const MAX_LATE_USAGE_MS = 30 * 24 * 60 * 60 * 1000;

export type MissedUsageSweepResult = { checked: number; reported: number; failed: number };

/**
 * Catch-up for orders whose usage report failed at finalize time (timeout, Stripe outage).
 * Only orders placed during the organization's current billing period are sent, so nothing
 * from a trial or an already-invoiced month is ever billed late.
 */
export async function reportMissedOrderUsage(
  db: Db,
  deps: { stripe?: StripeClient | null; fetchImpl?: FetchFn; now?: number; maxOrders?: number } = {}
): Promise<MissedUsageSweepResult> {
  const stripe = deps.stripe !== undefined ? deps.stripe : getStripeClient(deps.fetchImpl);
  const result: MissedUsageSweepResult = { checked: 0, reported: 0, failed: 0 };
  if (!stripe) return result;
  const now = deps.now ?? Date.now();
  const maxOrders = deps.maxOrders ?? 200;

  const { data: orgs } = await db
    .from("organizations")
    .select("id, stripe_customer_id, billing_period_start, plan_activated_at")
    .eq("subscription_status", "active");
  for (const org of (orgs ?? []) as Array<{
    id: string;
    stripe_customer_id: string | null;
    billing_period_start: string | null;
    plan_activated_at: string | null;
  }>) {
    if (!org.stripe_customer_id?.trim()) continue;
    const starts = [org.billing_period_start, org.plan_activated_at]
      .map((v) => (v ? Date.parse(v) : NaN))
      .filter((v) => Number.isFinite(v));
    if (starts.length === 0) continue;
    const since = Math.max(...starts, now - MAX_LATE_USAGE_MS);

    const { data: restaurants } = await db.from("restaurants").select("id").eq("organization_id", org.id);
    for (const r of (restaurants ?? []) as Array<{ id: string }>) {
      const { data: receipts } = await db
        .from("phone_order_receipts")
        .select("restaurant_id, session_id, items, created_at, usage_reported_at")
        .eq("restaurant_id", r.id);
      for (const receipt of (receipts ?? []) as Array<BillableReceiptRow & { usage_reported_at?: string | null }>) {
        if (receipt.usage_reported_at) continue;
        const created = Date.parse(receipt.created_at);
        if (!Number.isFinite(created) || created < since || created > now) continue;
        if (!isBillablePhoneOrderReceipt(receipt)) continue;
        if (result.checked >= maxOrders) return result;
        result.checked += 1;
        const outcome = await reportCompletedOrderUsage(db, { restaurantId: r.id, sessionId: receipt.session_id }, { stripe });
        if (outcome.reported) result.reported += 1;
        else if (outcome.reason === "failed") result.failed += 1;
      }
    }
  }
  return result;
}
