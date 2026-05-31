import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  BILLING_LAUNCH_POSTURE,
  isSelfServeCheckoutAvailable,
} from "@/lib/billing/launch-posture";
import { STRIPE_CHECKOUT_ENABLED } from "@/lib/billing/provider";

const REPO = join(import.meta.dirname, "../..");

describe("billing launch posture (launch 21)", () => {
  it("disables self-serve checkout flag", () => {
    expect(STRIPE_CHECKOUT_ENABLED).toBe(false);
    expect(isSelfServeCheckoutAvailable(false)).toBe(false);
  });

  it("documents success-based pilot model", () => {
    expect(BILLING_LAUNCH_POSTURE.pilotRate).toContain("$0.90");
    expect(BILLING_LAUNCH_POSTURE.pilotRate).toMatch(/successful phone order/i);
    expect(BILLING_LAUNCH_POSTURE.selfServeCheckout).toMatch(/not enabled/i);
    expect(BILLING_LAUNCH_POSTURE.pilotBilling).toMatch(/contact sales|manual/i);
  });

  it("billing dashboard hides checkout buttons unless checkout enabled", () => {
    const dash = readFileSync(
      join(REPO, "components/billing/BillingDashboard.tsx"),
      "utf8"
    );
    expect(dash).toContain("BILLING_LAUNCH_POSTURE");
    expect(dash).toContain("snapshot.checkoutEnabled");
    expect(dash).toContain("BillingCheckoutButtons");
    expect(dash).toContain("Pilot billing mode");
    expect(dash).not.toMatch(/btn-primary.*Upgrade to/);
  });

  it("onboarding has no Stripe gate", () => {
    const wizard = readFileSync(
      join(REPO, "components/onboarding/onboarding-wizard.tsx"),
      "utf8"
    );
    expect(wizard).not.toMatch(/stripe|STRIPE|checkout/i);
  });
});
