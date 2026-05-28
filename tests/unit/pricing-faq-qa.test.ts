import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildPricingPageJsonLd } from "@/lib/landing/pricing-faq-json-ld";
import { PRICING_FAQ, PRICING_PAGE_COPY } from "@/lib/landing/pricing-page-copy";

const REPO = join(import.meta.dirname, "../..");
const PRICING_FAQ_ANSWER_MAX = 100;

describe("pricing FAQ QA", () => {
  it("shows exactly four compact questions on the page", () => {
    expect(PRICING_FAQ).toHaveLength(4);
    for (const item of PRICING_FAQ) {
      expect(item.a.length).toBeLessThanOrEqual(PRICING_FAQ_ANSWER_MAX);
    }
  });

  it("covers AEO cost and billing intent in question text", () => {
    const questions = PRICING_FAQ.map((i) => i.q.toLowerCase()).join(" ");
    expect(questions).toMatch(/cost per|how much/);
    expect(questions).toMatch(/successful order|counts as an order/);
    expect(questions).toMatch(/hang-up|hang-ups/);
    expect(questions).toContain("per-minute");
  });

  it("aligns visible cost FAQ with JSON-LD AEO answer", () => {
    const cost = PRICING_FAQ.find((i) => /cost per|how much/i.test(i.q));
    const graph = buildPricingPageJsonLd();
    const aeo = graph.mainEntity[0];

    expect(cost?.a).toContain("$0.90");
    expect(aeo.name).toBe(PRICING_PAGE_COPY.aeo.question);
    expect(aeo.acceptedAnswer.text).toContain("$0.90");
    expect(aeo.acceptedAnswer.text).toContain(PRICING_PAGE_COPY.aeo.detail);
  });

  it("emits FAQPage schema for cost question plus visible FAQ", () => {
    const graph = buildPricingPageJsonLd();
    expect(graph["@type"]).toBe("FAQPage");
    expect(graph.mainEntity).toHaveLength(5);
  });

  it("uses collapsed accordion on pricing (not long divided list)", () => {
    const content = readFileSync(
      join(REPO, "components/landing/pricing/pricing-page-content.tsx"),
      "utf8"
    );
    expect(content).toContain('variant="accordion-marketing"');
    expect(content).not.toContain('variant="divided"');
    expect(content).not.toMatch(/faq\.description/);
  });

  it("keeps total visible FAQ copy lean", () => {
    const words = PRICING_FAQ.flatMap((i) => `${i.q} ${i.a}`.split(/\s+/)).length;
    expect(words).toBeLessThan(120);
  });
});
