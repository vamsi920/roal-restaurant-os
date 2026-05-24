import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildLimitChecks } from "@/lib/billing/limits";
import { DEV_MODE_LIMITS } from "@/lib/billing/plans";

const stripeState = vi.hoisted(() => ({
  secret: undefined as string | undefined,
  publishable: undefined as string | undefined,
}));

vi.mock("@/lib/env.public", () => ({
  getPublicEnv: () => ({
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: stripeState.publishable,
  }),
  resetPublicEnvCache: vi.fn(),
}));

vi.mock("@/lib/env.server", () => ({
  getServerEnv: () => ({
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: stripeState.publishable,
    STRIPE_SECRET_KEY: stripeState.secret,
  }),
  getEnvStatus: () => ({
    supabase: true,
    serviceRole: false,
    gemini: false,
    elevenlabs: false,
    agentTools: false,
    agentToolSigning: false,
    appUrl: true,
    stripe: Boolean(stripeState.secret && stripeState.publishable),
  }),
  resetServerEnvCache: vi.fn(),
}));

import {
  STRIPE_CHECKOUT_ENABLED,
  billingProvider,
  getBillingProviderConfig,
} from "@/lib/billing/provider";

beforeEach(() => {
  stripeState.secret = undefined;
  stripeState.publishable = undefined;
});

afterEach(() => {
  stripeState.secret = undefined;
  stripeState.publishable = undefined;
});

describe("getBillingProviderConfig", () => {
  it("returns dev mode when Stripe keys are missing", () => {
    const config = getBillingProviderConfig();
    expect(config.mode).toBe("dev");
    expect(config.isConfigured).toBe(false);
    expect(config.checkoutEnabled).toBe(false);
  });

  it("returns stripe mode with checkout disabled when keys are set", () => {
    stripeState.secret = "sk_test_x";
    stripeState.publishable = "pk_test_x";

    const config = getBillingProviderConfig();
    expect(config.mode).toBe("stripe");
    expect(config.isConfigured).toBe(true);
    expect(config.checkoutEnabled).toBe(STRIPE_CHECKOUT_ENABLED);
    expect(config.checkoutEnabled).toBe(false);
  });
});

describe("billingProvider actions", () => {
  it("returns not_configured when Stripe keys are missing", async () => {
    const result = await billingProvider.createCheckoutSession({
      organizationId: "org",
      planId: "growth",
      successUrl: "http://localhost/success",
      cancelUrl: "http://localhost/cancel",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("not_configured");
    expect(result.message).toMatch(/development mode|pilot billing/i);
  });

  it("returns not_implemented when keys exist but checkout is disabled", async () => {
    stripeState.secret = "sk_test_x";
    stripeState.publishable = "pk_test_x";

    const checkout = await billingProvider.createCheckoutSession({
      organizationId: "org",
      planId: "growth",
      successUrl: "http://localhost/success",
      cancelUrl: "http://localhost/cancel",
    });
    expect(checkout.ok).toBe(false);
    if (checkout.ok) return;
    expect(checkout.code).toBe("not_implemented");
    expect(checkout.message).toMatch(/not enabled|contact sales/i);

    const portal = await billingProvider.createPortalSession({
      organizationId: "org",
      returnUrl: "http://localhost/billing",
    });
    expect(portal.ok).toBe(false);
    if (portal.ok) return;
    expect(portal.code).toBe("not_implemented");
    expect(portal.message).toMatch(/Customer Portal is not enabled/i);
  });
});

describe("empty usage meters", () => {
  it("renders zero usage without exceeded state in dev limits", () => {
    const usage = {
      menuScans: 0,
      voiceOrders: 0,
      completedOrders: 0,
      toolCalls: 0,
      importAttempts: 0,
      activeLocations: 0,
      restaurantCount: 0,
    };
    const checks = buildLimitChecks(usage, DEV_MODE_LIMITS);
    expect(checks).toHaveLength(5);
    expect(checks.every((c) => c.level === "ok")).toBe(true);
    expect(checks.every((c) => c.used === 0)).toBe(true);
  });
});
