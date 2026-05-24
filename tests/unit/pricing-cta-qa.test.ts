import { describe, expect, it } from "vitest";
import { mailtoUsesPilotInbox } from "@/lib/landing/contact-mailto";
import { PUBLIC_CTA } from "@/lib/landing/public-cta";
import { PRICING_CTA, PRICING_PAGE_COPY } from "@/lib/landing/pricing-page-copy";

function collectPricingHrefs(): string[] {
  return [
    PRICING_CTA.primary.href,
    PRICING_CTA.secondary.href,
    PRICING_CTA.signup.href,
    PRICING_PAGE_COPY.primaryCard.ctas.primary.href,
    PRICING_PAGE_COPY.primaryCard.ctas.secondary.href,
  ];
}

describe("pricing CTA QA", () => {
  it("uses hear demo + book demo mailto on pricing surfaces", () => {
    expect(PRICING_CTA.primary).toEqual(PUBLIC_CTA.hearDemo);
    expect(PRICING_CTA.secondary).toEqual(PUBLIC_CTA.bookDemoMailto);
    expect(mailtoUsesPilotInbox(PRICING_CTA.secondary.href)).toBe(true);
  });

  it("primary card reuses PRICING_CTA", () => {
    expect(PRICING_PAGE_COPY.primaryCard.ctas).toEqual(PRICING_CTA);
  });

  it("all pricing CTAs resolve demo, signup, or pilot mailto", () => {
    const hrefs = collectPricingHrefs();
    expect(hrefs.some((h) => h === "/demo")).toBe(true);
    expect(hrefs.some((h) => h.startsWith("/signup"))).toBe(true);
    expect(hrefs.some((h) => mailtoUsesPilotInbox(h))).toBe(true);
  });
});
