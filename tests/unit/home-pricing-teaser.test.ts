import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { HOME_PAY } from "@/lib/landing/home-pay-copy";
import {
  PRICING_RATE_AMOUNT,
} from "@/lib/landing/pricing-core";

const REPO = join(import.meta.dirname, "../..");

describe("home pricing teaser", () => {
  it("centers on completed-order pricing from pricing-core", () => {
    expect(HOME_PAY.headline).toMatch(/orders/i);
    expect(HOME_PAY.amount).toBe(PRICING_RATE_AMOUNT);
    expect(HOME_PAY.unit).toBe("each completed order");
    expect(HOME_PAY.pricingHref).toBe("/pricing");
  });

  it("renders compact teaser with primary pricing CTA", () => {
    const section = readFileSync(
      join(REPO, "components/landing/home/sections/home-pay.tsx"),
      "utf8"
    );
    const css = readFileSync(join(REPO, "app/landing-home.css"), "utf8");

    expect(section).toContain('id="pay"');
    expect(section).toContain("home-pricing-teaser__amount");
    expect(section).toContain('variant="primary"');
    expect(section).not.toContain("PricingOrderExplainer");
    expect(section).not.toContain("home-pay-layout");
    expect(css).toContain(".home-pricing-teaser__amount");
    expect(css).toContain(".home-pricing-teaser__cta .public-btn-primary");
  });
});
