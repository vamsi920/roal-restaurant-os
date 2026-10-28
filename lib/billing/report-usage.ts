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
