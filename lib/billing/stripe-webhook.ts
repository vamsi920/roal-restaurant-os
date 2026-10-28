import type { Db } from "@/lib/db";
import type { StripeEvent } from "@/lib/billing/stripe";
import type { SubscriptionStatus } from "@/lib/billing/types";
import { provisionPhoneLinesForOrganization } from "@/lib/telephony/provision-phone-line";

/**
 * Payment events → organization plan state. When a plan becomes active, every location gets
 * its own phone line (same as the staff "activate" route). Every step is idempotent so Stripe
 * retries and duplicate events are harmless.
 */

export type WebhookDeps = {
  provisionLines?: typeof provisionPhoneLinesForOrganization;
};

export type WebhookOutcome =
  | { handled: false; reason: string }
  | { handled: true; organizationId: string; status: SubscriptionStatus; linesProvisioned: number };

type Obj = Record<string, unknown>;

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
/** Stripe fields can be an id string or an expanded object. */
const idOf = (v: unknown): string | null => str(v) ?? (v && typeof v === "object" ? str((v as Obj).id) : null);

export function mapSubscriptionStatus(stripeStatus: string | null): SubscriptionStatus | null {
  switch (stripeStatus) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
      return "canceled";
    case "paused":
      return "paused";
    default:
      return null; // "incomplete": wait for the payment to finish
  }
}

/** Period dates live on the subscription (older API versions) or on its first item (newer). */
function subscriptionPeriod(sub: Obj): { start: string | null; end: string | null } {
  const items = (sub.items as { data?: Obj[] } | undefined)?.data ?? [];
  const startSec = (sub.current_period_start ?? items[0]?.current_period_start) as number | undefined;
  const endSec = (sub.current_period_end ?? items[0]?.current_period_end) as number | undefined;
  const iso = (s: number | undefined) => (typeof s === "number" ? new Date(s * 1000).toISOString() : null);
  return { start: iso(startSec), end: iso(endSec) };
}

async function findOrganizationId(db: Db, explicit: string | null, customerId: string | null): Promise<string | null> {
  if (explicit) {
    const { data } = await db.from("organizations").select("id").eq("id", explicit).maybeSingle();
    if (data) return explicit;
  }
  if (customerId) {
    const { data } = await db.from("organizations").select("id").eq("stripe_customer_id", customerId).limit(1).maybeSingle();
    if (data?.id) return String(data.id);
  }
  return null;
}

async function applyStatus(
  db: Db,
  organizationId: string,
  status: SubscriptionStatus,
  extra: Obj,
  deps: WebhookDeps
): Promise<WebhookOutcome> {
  const patch: Obj = { subscription_status: status, updated_at: new Date().toISOString() };
  for (const [k, v] of Object.entries(extra)) if (v != null) patch[k] = v;
  const { error } = await db.from("organizations").update(patch).eq("id", organizationId);
  if (error) throw new Error(error.message);

  let linesProvisioned = 0;
  if (status === "active") {
    const provision = deps.provisionLines ?? provisionPhoneLinesForOrganization;
    const lines = await provision(db, organizationId);
    linesProvisioned = lines.filter((l) => l.result.ok).length;
  }
  return { handled: true, organizationId, status, linesProvisioned };
}

export async function handleStripeEvent(db: Db, event: StripeEvent, deps: WebhookDeps = {}): Promise<WebhookOutcome> {
  const obj = event.data?.object ?? {};
  const metadata = (obj.metadata ?? {}) as Obj;

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      if (obj.mode !== "subscription") return { handled: false, reason: "not a subscription checkout" };
      // Card payments arrive "paid"; a $0 first invoice (usage billing) arrives "no_payment_required".
      if (obj.payment_status === "unpaid") return { handled: false, reason: "payment pending" };
      const customer = idOf(obj.customer);
      const orgId = await findOrganizationId(db, str(obj.client_reference_id) ?? str(metadata.organization_id), customer);
      if (!orgId) return { handled: false, reason: "organization not found" };
      return applyStatus(
        db,
        orgId,
        "active",
        { stripe_customer_id: customer, stripe_subscription_id: idOf(obj.subscription) },
        deps
      );
    }

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const status =
        event.type === "customer.subscription.deleted" ? "canceled" : mapSubscriptionStatus(str(obj.status));
      if (!status) return { handled: false, reason: `subscription ${String(obj.status)}` };
      const customer = idOf(obj.customer);
      const orgId = await findOrganizationId(db, str(metadata.organization_id), customer);
      if (!orgId) return { handled: false, reason: "organization not found" };
      const period = subscriptionPeriod(obj);
      return applyStatus(
        db,
        orgId,
        status,
        {
          stripe_customer_id: customer,
          stripe_subscription_id: str(obj.id),
          billing_period_start: period.start,
          billing_period_end: period.end,
        },
        deps
      );
    }

    default:
      return { handled: false, reason: `ignored ${event.type}` };
  }
}
