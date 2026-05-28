import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PRICING_SUCCESS_HEADLINE } from "@/lib/landing/pricing-core";
import { PRICING_FAQ, PRICING_PAGE_COPY, PRICING_PILL_PRICE } from "@/lib/landing/pricing-page-copy";

const REPO = join(import.meta.dirname, "../..");

describe("pricing page layout", () => {
  it("keeps a compact FAQ slice", () => {
    expect(PRICING_FAQ.length).toBeLessThanOrEqual(5);
    expect(PRICING_FAQ.length).toBeGreaterThanOrEqual(4);
  });

  it("leads with simple success pricing without enterprise filler", () => {
    expect(PRICING_PAGE_COPY.primaryCard.headline).toBe(PRICING_SUCCESS_HEADLINE);
    const blob = JSON.stringify(PRICING_PAGE_COPY) + PRICING_FAQ.map((i) => i.a).join(" ");
    expect(blob).not.toMatch(/enterprise|integration|SSO|tiered/i);
  });

  it("shows owner-friendly two-line order explainer with examples", () => {
    expect(PRICING_PAGE_COPY.whatCounts.payLine).toContain("$0.90");
    expect(PRICING_PAGE_COPY.whatCounts.noPayLine).toMatch(/no charge|do not pay/i);
    expect(PRICING_PAGE_COPY.whatCounts.payExamples.length).toBeGreaterThanOrEqual(1);
    expect(PRICING_PAGE_COPY.whatCounts.noPayExamples.length).toBeGreaterThanOrEqual(1);
  });

  it("primary card shows rate without long billable lists", () => {
    const card = PRICING_PAGE_COPY.primaryCard;
    expect(card.rate).toBe("$0.90");
    expect(card.rateUnit).toBe("/order");
    expect(card.tagline).toContain("do not pay");
    expect(card.billableItems).toHaveLength(0);
    expect(card.freeItems).toHaveLength(0);
  });

  it("hero surfaces $0.90/order for aria and display", () => {
    const card = readFileSync(
      join(REPO, "components/landing/pricing/pricing-primary-card.tsx"),
      "utf8"
    );
    expect(PRICING_PILL_PRICE).toBe("$0.90/order");
    expect(card).toContain("PRICING_PILL_PRICE");
    expect(card).toContain("public-pricing-primary-card__tagline");
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
    expect(content).toContain("PricingOrderExplainer");
    expect(card).toContain("public-pricing-primary-card__headline");
    expect(card).toContain("public-pricing-primary-card__tagline");
    expect(card).toContain("card.billableItems.length");
    expect(content).toContain("PricingPilotSetup");
    expect(content).toContain('variant="accordion-marketing"');
    expect(content).toContain("PublicCtaBand");
    expect(content).not.toContain("PRICING_PLANS");
    expect(content).not.toContain("PricingCompare");
    expect(content).not.toContain("PricingIncluded");
  });

  it("keeps pricing explainer, FAQ, and CTAs visible on mobile (responsive UI prompt 10)", () => {
    const mobile = readFileSync(join(REPO, "app/public-mobile-pages.css"), "utf8");
    const theme = readFileSync(join(REPO, "app/public-theme.css"), "utf8");
    const explainer = readFileSync(
      join(REPO, "components/landing/pricing/pricing-order-explainer.tsx"),
      "utf8"
    );

    expect(mobile).not.toMatch(
      /\.public-pricing-page__orders[\s\S]*display:\s*none/
    );
    expect(explainer).toContain("public-pricing-orders__grid");
    expect(theme).toContain("Pricing page responsive (prompt 10)");
    expect(theme).toMatch(
      /\.public-pricing-page__orders\.landing-section[\s\S]*display:\s*block/
    );
  });
});
