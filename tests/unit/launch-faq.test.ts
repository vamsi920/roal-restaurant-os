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
    expect(PRICING_FAQ).toHaveLength(4);
    expect(SECURITY_FAQ).toHaveLength(4);
  });

  it("covers homepage buyer topics in order (prompt 33)", () => {
    expect(HOME_FAQ.items.map((i) => i.id)).toEqual([
      "home-what-calls",
      "home-menu-setup",
      "home-natural-voice",
      "home-completed-order",
      "home-how-to-start",
    ]);
    expect(launchFaqItemsFor("pricing").map((i) => i.id)).toEqual([
      "pricing-cost",
      "successful-order",
      "rings-not-billed",
      "per-minute",
    ]);
  });

  it("keeps home questions and answers short", () => {
    for (const item of HOME_FAQ.items) {
      expect(item.question.length).toBeLessThanOrEqual(48);
      expect(item.answer.length).toBeLessThanOrEqual(120);
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
    const homeOrder = HOME_FAQ.items.find((i) => i.id === "home-completed-order");
    const pricing = PRICING_FAQ.find((i) => i.q.includes("counts as an order"));
    expect(homeOrder?.answer.toLowerCase()).toContain("kitchen screen");
    expect(pricing?.a).toMatch(/kitchen screen|KDS/i);
  });

  it("keeps pricing FAQ questions and answers short and plain", () => {
    for (const item of PRICING_FAQ) {
      expect(item.q.length).toBeLessThanOrEqual(40);
      expect(item.a.length).toBeLessThanOrEqual(90);
      expect(item.a).not.toMatch(/enterprise|integration/i);
    }
  });

  it("links voice and start entries to demo and signup", () => {
    expect(HOME_FAQ.items.find((i) => i.id === "home-natural-voice")?.link?.href).toBe(
      "/demo"
    );
    expect(HOME_FAQ.items.find((i) => i.id === "home-how-to-start")?.link?.href).toBe(
      "/signup?next=/dashboard/restaurants"
    );
  });
});
