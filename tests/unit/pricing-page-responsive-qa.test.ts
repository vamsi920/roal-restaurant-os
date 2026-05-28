import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PRICING_SUCCESS_HEADLINE,
  PRICING_ORDER_EXPLAINER,
} from "@/lib/landing/pricing-core";
import { PRICING_PAGE_COPY } from "@/lib/landing/pricing-page-copy";

const REPO = join(import.meta.dirname, "../..");
const read = (rel: string) => readFileSync(join(REPO, rel), "utf8");

describe("pricing page responsive (prompt 10)", () => {
  it("prioritizes successful-order messaging in hero and close band", () => {
    expect(PRICING_PAGE_COPY.primaryCard.headline).toBe(PRICING_SUCCESS_HEADLINE);
    expect(PRICING_PAGE_COPY.close.title).toBe(PRICING_SUCCESS_HEADLINE);
    expect(PRICING_PAGE_COPY.primaryCard.tagline).toMatch(/do not pay|no charge/i);
  });

  it("uses compact pay vs no-pay explainer copy", () => {
    expect(PRICING_ORDER_EXPLAINER.payLine).toContain("$0.90");
    expect(PRICING_ORDER_EXPLAINER.noPayLine.length).toBeLessThanOrEqual(40);
    expect(PRICING_ORDER_EXPLAINER.payLine.length).toBeLessThanOrEqual(72);
  });

  it("styles two-column explainer from tablet and stacks on phone", () => {
    const css = read("app/public-theme.css");
    expect(css).toContain(".public-pricing-orders__grid");
    expect(css).toMatch(
      /@media \(min-width: 640px\)[\s\S]*\.public-pricing-orders__grid[\s\S]*grid-template-columns:\s*repeat\(2/
    );
    expect(css).toMatch(
      /@media \(max-width: 767px\)[\s\S]*\.public-pricing-faq \.public-faq__accordion-q[\s\S]*min-height:\s*2\.75rem/
    );
  });
});
