import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { HOME_PAY } from "@/lib/landing/home-pay-copy";
import { HOME_PRICING_PILL } from "@/lib/landing/home-theme";

const REPO = join(import.meta.dirname, "../..");

describe("home pricing teaser", () => {
  it("uses success-only headline and published order rate", () => {
    expect(HOME_PAY.title).toBe("No ticket on your pass? You do not pay.");
    expect(HOME_PAY.price).toBe("$0.90/order");
    expect(HOME_PAY.price).toBe(HOME_PRICING_PILL.price);
    expect(HOME_PAY.pricingHref).toBe("/pricing");
  });

  it("renders compact teaser section with price emphasis", () => {
    const section = readFileSync(
      join(REPO, "components/landing/home/sections/home-pay.tsx"),
      "utf8"
    );
    const css = readFileSync(join(REPO, "app/landing-home.css"), "utf8");

    expect(section).toContain('id="pay"');
    expect(section).toContain("home-pricing-teaser__price");
    expect(section).not.toContain("home-pay-layout");
    expect(css).toContain(".home-pricing-teaser__price");
  });
});
