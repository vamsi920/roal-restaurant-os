import { getEnvStatus, getServerEnv } from "@/lib/env.server";
import type {
  BillingPlanId,
  BillingProviderMode,
} from "@/lib/billing/types";

/** Flip when Stripe Checkout + Customer Portal ship. */
export const STRIPE_CHECKOUT_ENABLED = false;

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
  | { ok: false; code: "not_configured" | "not_implemented"; message: string };

/** Stripe-ready hooks; dev mode returns structured not_configured. */
export const billingProvider = {
  async createCheckoutSession(
    _req: CheckoutSessionRequest // eslint-disable-line @typescript-eslint/no-unused-vars -- Stripe stub
  ): Promise<BillingProviderActionResult> {
    const config = getBillingProviderConfig();
    if (config.mode !== "stripe") {
      return {
        ok: false,
        code: "not_configured",
        message:
          "Stripe is not connected. Pilot billing runs in development mode with relaxed limits—no checkout required to onboard.",
      };
    }
    if (!config.checkoutEnabled) {
      return {
        ok: false,
        code: "not_implemented",
        message:
          "Self-serve Stripe Checkout is not enabled. Pilots use success-based terms via contact sales—no payment is processed here.",
      };
    }
    return {
      ok: false,
      code: "not_implemented",
      message: "Stripe Checkout will be enabled in a follow-up release.",
    };
  },

  async createPortalSession(
    _req: BillingPortalRequest // eslint-disable-line @typescript-eslint/no-unused-vars -- Stripe stub
  ): Promise<BillingProviderActionResult> {
    const config = getBillingProviderConfig();
    if (config.mode !== "stripe") {
      return {
        ok: false,
        code: "not_configured",
        message: "Connect Stripe to manage payment methods and invoices.",
      };
    }
    if (!config.checkoutEnabled) {
      return {
        ok: false,
        code: "not_implemented",
        message:
          "Stripe Customer Portal is not enabled yet. Keys are configured for a future release.",
      };
    }
    return {
      ok: false,
      code: "not_implemented",
      message: "Stripe Customer Portal will be enabled in a follow-up release.",
    };
  },
};
