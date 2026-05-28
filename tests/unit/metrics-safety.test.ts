import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { HOME_CAPABILITIES } from "@/lib/landing/home-capabilities-copy";
import { HOME_METRICS } from "@/lib/landing/home-metrics-copy";
import { HOME_SAVINGS } from "@/lib/landing/home-savings-copy";
import { SOCIAL_PROOF_DEMO } from "@/lib/landing/social-proof-demo";
import { SUCCESS_PRICING_DEMO } from "@/lib/landing/success-pricing-demo";

const REPO = join(import.meta.dirname, "../..");

describe("metrics safety copy", () => {
  it("landing page uses capability strip not pilot metric totals (prompt 32)", () => {
    const page = readFileSync(
      join(REPO, "components/landing/landing-page.tsx"),
      "utf8"
    );
    expect(page).toContain("HomeCapabilitiesStrip");
    expect(page).not.toContain("HomeMetricsStrip");
  });

  it("homepage capabilities have no numeric claims", () => {
    const blob = JSON.stringify(HOME_CAPABILITIES);
    expect(blob).not.toMatch(/\d+%/);
    expect(HOME_CAPABILITIES.note).toMatch(/not verified/i);
    expect(HOME_METRICS).toEqual(HOME_CAPABILITIES);
    for (const item of HOME_CAPABILITIES.items) {
      const text = `${item.title} ${item.body}`.toLowerCase();
      expect(text).not.toMatch(/\d+/);
      expect(text).not.toContain("recovered");
      expect(text).not.toContain("saved");
    }
  });

  it("savings card labels example inputs", () => {
    expect(HOME_SAVINGS.eyebrow.toLowerCase()).toContain("example");
    expect(HOME_SAVINGS.rows.every((r) => r.label.toLowerCase().includes("example"))).toBe(true);
    expect(HOME_SAVINGS.note.toLowerCase()).toContain("not a quote");
  });

  it("social proof uses capability statements not KPI units", () => {
    expect(SOCIAL_PROOF_DEMO.capabilities).toHaveLength(3);
    const blob = JSON.stringify(SOCIAL_PROOF_DEMO);
    expect(blob).not.toMatch(/orders \/ week|calls \/ rush|%/);
    expect(SOCIAL_PROOF_DEMO.honesty).toMatch(/not verified/i);
  });

  it("pricing demo states illustrative week", () => {
    expect(SUCCESS_PRICING_DEMO.visual.periodLabel.toLowerCase()).toContain("example");
    expect(SUCCESS_PRICING_DEMO.honesty.toLowerCase()).toContain("example");
  });
});
