import { getEnvStatus, getServerEnv } from "@/lib/env.server";
import { getDb, type Db } from "@/lib/db";
import {
  createStripeClient,
  ensureOrderPrice,
  ensurePortalConfiguration,
  type FetchFn,
  type StripeClient,
} from "@/lib/billing/stripe";
import type {
  BillingPlanId,
  BillingProviderMode,
} from "@/lib/billing/types";

/** Self-serve checkout is live whenever Stripe keys are configured. */
export const STRIPE_CHECKOUT_ENABLED = true;

export type BillingProviderConfig = {
  mode: BillingProviderMode;
  isConfigured: boolean;
  checkoutEnabled: boolean;
  publishableKey: string | null;
};

export function getBillingProviderConfig(): BillingProviderConfig {
  const env = getServerEnv();
  const status = getEnvStatus();
  if (status.stripe && env.STRIPE_SECRET_KEY && env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    return {
      mode: "stripe",
      isConfigured: true,
      checkoutEnabled: STRIPE_CHECKOUT_ENABLED,
      publishableKey: env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    };
  }
  return {
    mode: "dev",
    isConfigured: false,
    checkoutEnabled: false,
    publishableKey: null,
  };
}

/** Server-side Stripe client, or null when keys are missing. */
export function getStripeClient(fetchImpl?: FetchFn): StripeClient | null {
  const secret = getServerEnv().STRIPE_SECRET_KEY?.trim();
  if (!secret || getBillingProviderConfig().mode !== "stripe") return null;
  return createStripeClient(secret, fetchImpl);
}

export type CheckoutSessionRequest = {
  organizationId: string;
  planId: BillingPlanId;
  successUrl: string;
  cancelUrl: string;
};

export type BillingPortalRequest = {
  organizationId: string;
  returnUrl: string;
};

export type BillingProviderActionResult =
  | { ok: true; url: string }
  | { ok: false; code: "not_configured" | "not_implemented" | "failed"; message: string };

type ProviderDeps = { db?: Db; fetchImpl?: FetchFn };

const NOT_CONFIGURED: BillingProviderActionResult = {
  ok: false,
  code: "not_configured",
  message: "Online payment isn't switched on yet. Get in touch and we'll start your plan for you.",
};

const FAILED: BillingProviderActionResult = {
  ok: false,
  code: "failed",
  message: "We couldn't open the payment page just now. Please try again in a minute.",
};

/** Reuse the organization's billing customer, creating and saving one on first checkout. */
async function ensureCustomer(db: Db, stripe: StripeClient, organizationId: string): Promise<string> {
  const { data: org, error } = await db
    .from("organizations")
    .select("id, name, stripe_customer_id")
    .eq("id", organizationId)
    .maybeSingle<{ id: string; name: string | null; stripe_customer_id: string | null }>();
  if (error) throw new Error(error.message);
  if (!org) throw new Error("Organization not found.");
  if (org.stripe_customer_id?.trim()) return org.stripe_customer_id.trim();

  const customer = await stripe.post<{ id: string }>(
    "/customers",
    { name: org.name ?? undefined, metadata: { organization_id: organizationId } },
    { idempotencyKey: `customer-${organizationId}` }
  );
  await db
    .from("organizations")
    .update({ stripe_customer_id: customer.id, updated_at: new Date().toISOString() })
    .eq("id", organizationId);
  return customer.id;
}

export const billingProvider = {
  async createCheckoutSession(
    req: CheckoutSessionRequest,
    deps: ProviderDeps = {}
  ): Promise<BillingProviderActionResult> {
    const stripe = getStripeClient(deps.fetchImpl);
    if (!stripe) return NOT_CONFIGURED;
    const db = deps.db ?? getDb();
    try {
      const [customer, price] = await Promise.all([
        ensureCustomer(db, stripe, req.organizationId),
        ensureOrderPrice(stripe),
      ]);
      const metadata = { organization_id: req.organizationId, plan_id: req.planId };
      const session = await stripe.post<{ url?: string }>("/checkout/sessions", {
        mode: "subscription",
        customer,
        client_reference_id: req.organizationId,
        line_items: [{ price }],
        payment_method_collection: "always",
        metadata,
        subscription_data: { metadata },
        success_url: req.successUrl,
        cancel_url: req.cancelUrl,
      });
      if (!session.url) return FAILED;
      return { ok: true, url: session.url };
    } catch (e) {
      console.error("[billing] checkout", e instanceof Error ? e.message : e);
      return FAILED;
    }
  },

  async createPortalSession(
    req: BillingPortalRequest,
    deps: ProviderDeps = {}
  ): Promise<BillingProviderActionResult> {
    const stripe = getStripeClient(deps.fetchImpl);
    if (!stripe) return NOT_CONFIGURED;
    const db = deps.db ?? getDb();
    try {
      const { data: org } = await db
        .from("organizations")
        .select("stripe_customer_id")
        .eq("id", req.organizationId)
        .maybeSingle<{ stripe_customer_id: string | null }>();
      const customer = org?.stripe_customer_id?.trim();
      if (!customer) {
        return { ok: false, code: "not_implemented", message: "Start your plan first, then you can manage payment here." };
      }
      const configuration = await ensurePortalConfiguration(stripe);
      const session = await stripe.post<{ url?: string }>("/billing_portal/sessions", {
        customer,
        configuration,
        return_url: req.returnUrl,
      });
      if (!session.url) return FAILED;
      return { ok: true, url: session.url };
    } catch (e) {
      console.error("[billing] portal", e instanceof Error ? e.message : e);
      return FAILED;
    }
  },
};
