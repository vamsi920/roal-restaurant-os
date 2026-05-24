import { describe, expect, it } from "vitest";
import {
  HOME_FAQ,
  PRICING_FAQ,
  SECURITY_FAQ,
  launchFaqItemsFor,
} from "@/lib/landing/launch-faq";

describe("launch FAQ", () => {
  it("exports ordered slices per page", () => {
    expect(HOME_FAQ.items).toHaveLength(5);
    expect(PRICING_FAQ).toHaveLength(5);
    expect(SECURITY_FAQ).toHaveLength(6);
  });

  it("covers homepage topics in order", () => {
    expect(HOME_FAQ.items.map((i) => i.id)).toEqual([
      "home-pricing-rate",
      "setup-time",
      "menu-accuracy",
      "human-handoff",
      "demo-onboarding",
    ]);
    expect(launchFaqItemsFor("pricing").map((i) => i.id)).toEqual([
      "pricing-cost",
      "successful-order",
      "rings-not-billed",
      "per-minute",
      "setup-cost",
    ]);
  });

  it("keeps home answers short", () => {
    for (const item of HOME_FAQ.items) {
      expect(item.answer.length).toBeLessThanOrEqual(160);
    }
  });

  it("uses unique ids across all entries", () => {
    const items = [
      ...launchFaqItemsFor("home"),
      ...launchFaqItemsFor("pricing"),
      ...launchFaqItemsFor("security"),
    ];
    const ids = items.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("aligns successful-order wording with pricing FAQ", () => {
    const successful = PRICING_FAQ.find((i) => i.q.startsWith("What counts"));
    expect(successful?.a).toMatch(/kitchen screen|KDS/i);
    expect(successful?.a.toLowerCase()).toContain("name and phone");
  });

  it("keeps pricing FAQ answers short and plain", () => {
    for (const item of PRICING_FAQ) {
      expect(item.a.length).toBeLessThanOrEqual(100);
      expect(item.a).not.toMatch(/enterprise|integration/i);
    }
  });

  it("links demo onboarding to demo page", () => {
    const demo = HOME_FAQ.items.find((i) => i.id === "demo-onboarding");
    expect(demo?.link?.href).toBe("/demo");
  });
});
