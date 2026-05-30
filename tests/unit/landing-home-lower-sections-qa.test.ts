import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { HOME_HOW_FLOW } from "@/lib/landing/home-how-flow-copy";
import { HOME_PRODUCT_INTRO } from "@/lib/landing/home-product-intro-copy";
import { HOME_FAQ } from "@/lib/landing/launch-faq";

const REPO = join(import.meta.dirname, "../..");
const read = (rel: string) => readFileSync(join(REPO, rel), "utf8");

describe("landing home lower sections (responsive UI prompt 08)", () => {
  it("keeps layman-scannable copy without duplicate section titles", () => {
    expect(HOME_PRODUCT_INTRO.lead.length).toBeLessThanOrEqual(140);
    expect(HOME_HOW_FLOW.eyebrow).not.toBe(HOME_HOW_FLOW.title);
    expect(HOME_HOW_FLOW.lead.length).toBeLessThanOrEqual(72);
    for (const beat of HOME_HOW_FLOW.beats) {
      expect(beat.body.length).toBeLessThanOrEqual(82);
    }
    expect(HOME_FAQ.lead.length).toBeLessThanOrEqual(72);
  });

  it("locks lower-section overflow and tablet capability grid in CSS", () => {
    const css = read("app/landing-home.css");
    expect(css).toContain("Lower sections: scan + overflow");
    expect(css).toMatch(
      /\.home-metrics \.home-wrap[\s\S]*overflow-x:\s*clip/
    );
    expect(css).toMatch(
      /@media \(min-width: 768px\) and \(max-width: 1023px\)[\s\S]*\.home-metrics__strip[\s\S]*grid-template-columns:\s*repeat\(2/
    );
    expect(css).toMatch(
      /\.home-how-flow--compact[\s\S]*\.home-how-flow__steps::before/
    );
    expect(css).toMatch(
      /@media \(max-width: 767px\)[\s\S]*\.home-pricing-teaser__cta \.public-btn-primary[\s\S]*width:\s*100%/
    );
  });
});
