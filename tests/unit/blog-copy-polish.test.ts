import { describe, expect, it } from "vitest";
import { getPostBySlug } from "@/lib/blog";

const TOP_SIX = [
  "pay-only-successful-orders",
  "cost-unanswered-restaurant-phone-calls",
  "why-restaurants-miss-calls-dinner-rush",
  "ai-phone-ordering-small-restaurants",
  "rush-hour-staffing-phone-line",
  "setup-roal-20-minutes",
] as const;

describe("blog copy polish (top 6)", () => {
  it.each(TOP_SIX)("%s has tightened intro and CTA description", (slug) => {
    const post = getPostBySlug(slug);
    expect(post?.content).toBeDefined();
    const { summary, answerShort, cta } = post!.content!;
    expect(summary.length).toBeLessThan(220);
    expect(answerShort.length).toBeLessThan(520);
    expect(cta.description?.trim().length).toBeGreaterThan(20);
    expect(cta.description).not.toMatch(/act now|limited time|don't miss/i);
  });

  it("setup post points signup CTA at menu trial", () => {
    const cta = getPostBySlug("setup-roal-20-minutes")!.content!.cta;
    expect(cta.href).toBe("/signup");
    expect(cta.description).toContain("test call");
  });

  it("pricing posts mention demo without hard-close phrasing", () => {
    for (const slug of [
      "pay-only-successful-orders",
      "cost-unanswered-restaurant-phone-calls",
    ] as const) {
      const desc = getPostBySlug(slug)!.content!.cta.description ?? "";
      expect(desc).toMatch(/demo/i);
      expect(desc).not.toMatch(/before you forward live guests/i);
    }
  });
});
