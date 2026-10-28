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
  it("enables self-serve checkout once payment keys are set", () => {
    expect(STRIPE_CHECKOUT_ENABLED).toBe(true);
    expect(isSelfServeCheckoutAvailable(false)).toBe(false);
    expect(isSelfServeCheckoutAvailable(true)).toBe(true);
  });

  it("documents success-based pilot model", () => {
    expect(BILLING_LAUNCH_POSTURE.pilotRate).toContain("$0.90");
    expect(BILLING_LAUNCH_POSTURE.pilotRate).toMatch(/successful phone order/i);
    expect(BILLING_LAUNCH_POSTURE.selfServeCheckout).toMatch(/start the plan online/i);
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
    expect(dash).toContain("You only pay $0.90 when a call becomes an order");
    expect(dash).not.toMatch(/btn-primary.*Upgrade to/);
    expect(dash).not.toMatch(/Stripe|webhook/);
  });

});
