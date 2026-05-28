import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");
const CSS = () => readFileSync(join(REPO, "app/landing-home.css"), "utf8");

describe("home hero responsive (prompt 06)", () => {
  it("keeps frosted surface and does not remove video layer hooks", () => {
    const css = CSS();
    const hero = readFileSync(
      join(REPO, "components/landing/home/landing-home-hero.tsx"),
      "utf8"
    );
    expect(hero).toContain("home-hero__surface");
    expect(css).toMatch(/\.home-hero__surface[\s\S]*backdrop-filter:\s*blur/);
    expect(css).toContain(".home-video-layer__video");
  });

  it("constrains hero stack width and pill on narrow phones", () => {
    const css = CSS();
    expect(css).toContain(".home-hero__content > *");
    expect(css).toContain(".home-pricing-pill--hero");
    expect(css).toMatch(
      /@media \(max-width: 479px\)[\s\S]*\.home-pricing-pill--hero[\s\S]*hyphens:\s*auto/
    );
    expect(css).toMatch(
      /@media \(max-width: 479px\)[\s\S]*\.home-hero__surface[\s\S]*overflow:\s*hidden/
    );
  });

  it("adds tablet and desktop hero spacing bands", () => {
    const css = CSS();
    expect(css).toMatch(
      /@media \(min-width: 768px\) and \(max-width: 1023px\)[\s\S]*\.home-hero__surface/
    );
    expect(css).toMatch(
      /@media \(min-width: 1024px\)[\s\S]*\.home-hero__surface[\s\S]*max-width:\s*min\(42rem/
    );
  });
});
