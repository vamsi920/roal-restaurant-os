import { describe, expect, it } from "vitest";
import { HOME_METRICS } from "@/lib/landing/home-metrics-copy";
import { HOME_SAVINGS } from "@/lib/landing/home-savings-copy";
import { SOCIAL_PROOF_DEMO } from "@/lib/landing/social-proof-demo";
import { SUCCESS_PRICING_DEMO } from "@/lib/landing/success-pricing-demo";

describe("metrics safety copy", () => {
  it("homepage metrics strip has no numeric claims", () => {
    const blob = JSON.stringify(HOME_METRICS);
    expect(blob).not.toMatch(/\d+%/);
    expect(HOME_METRICS.eyebrow.toLowerCase()).toContain("example");
    expect(HOME_METRICS.note.toLowerCase()).toContain("example month");
    expect(HOME_METRICS.note.toLowerCase()).toContain("track");
    expect(HOME_METRICS.note.toLowerCase()).toMatch(/not a guarantee|not published guarantees/);
  });

  it("homepage metrics items use pilot tracking language", () => {
    const banned = ["guaranteed", "proven", "always ", "every restaurant"];
    for (const item of HOME_METRICS.items) {
      const blob = `${item.title} ${item.body}`.toLowerCase();
      expect(blob).toMatch(/pilot|track|example/);
      for (const word of banned) {
        expect(blob).not.toContain(word);
      }
    }
  });

  it("savings card labels example inputs", () => {
    expect(HOME_SAVINGS.eyebrow.toLowerCase()).toContain("example");
    expect(HOME_SAVINGS.rows.every((r) => r.label.toLowerCase().includes("example"))).toBe(true);
    expect(HOME_SAVINGS.note.toLowerCase()).toContain("not a quote");
  });

  it("social proof avoids invented accuracy percentages", () => {
    const accuracy = SOCIAL_PROOF_DEMO.metrics.find((m) => m.id === "order-accuracy");
    expect(accuracy?.unit).not.toMatch(/^%/);
    expect(accuracy?.body.toLowerCase()).not.toContain("guaranteed");
  });

  it("pricing demo states illustrative week", () => {
    expect(SUCCESS_PRICING_DEMO.visual.periodLabel.toLowerCase()).toContain("example");
    expect(SUCCESS_PRICING_DEMO.honesty.toLowerCase()).toContain("example");
  });
});
