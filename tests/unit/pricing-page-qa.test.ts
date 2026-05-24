import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PRICING_FAQ, PRICING_PAGE_COPY } from "@/lib/landing/pricing-page-copy";

const REPO = join(import.meta.dirname, "../..");

describe("pricing page layout", () => {
  it("keeps a compact FAQ slice", () => {
    expect(PRICING_FAQ.length).toBeLessThanOrEqual(5);
    expect(PRICING_FAQ.length).toBeGreaterThanOrEqual(4);
  });

  it("leads with success-only headline without enterprise filler", () => {
    expect(PRICING_PAGE_COPY.primaryCard.headline).toBe("Only pay for successful orders");
    const blob = JSON.stringify(PRICING_PAGE_COPY) + PRICING_FAQ.map((i) => i.a).join(" ");
    expect(blob).not.toMatch(/enterprise|integration|SSO|tiered/i);
  });

  it("primary card shows rate and billable vs free lists", () => {
    const card = PRICING_PAGE_COPY.primaryCard;
    expect(card.rate).toBe("$0.90");
    expect(card.rateUnit).toBe("per successful order");
    expect(card.billableItems.length).toBeGreaterThanOrEqual(2);
    expect(card.freeItems).toContain("Per-minute phone fees");
  });

  it("renders hero card, pilot setup, faq, and close CTA only", () => {
    const page = readFileSync(join(REPO, "app/pricing/page.tsx"), "utf8");
    const content = readFileSync(
      join(REPO, "components/landing/pricing/pricing-page-content.tsx"),
      "utf8"
    );
    const card = readFileSync(
      join(REPO, "components/landing/pricing/pricing-primary-card.tsx"),
      "utf8"
    );

    expect(page).not.toContain("MarketingPageHero");
    expect(content).toContain("PricingPrimaryCard");
    expect(card).toContain("public-pricing-primary-card__headline");
    expect(card).toContain("public-pricing-primary-card__lists");
    expect(content).toContain("PricingPilotSetup");
    expect(content).toContain('variant="accordion-marketing"');
    expect(content).toContain("PublicCtaBand");
    expect(content).not.toContain("PRICING_PLANS");
    expect(content).not.toContain("PricingCompare");
    expect(content).not.toContain("PricingIncluded");
  });
});
