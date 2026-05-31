import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");
const CSS = () => readFileSync(join(REPO, "app/landing-home.css"), "utf8");

describe("home hero responsive (prompt 06)", () => {
  it("keeps frosted surface and does not remove video layer hooks", () => {
    const css = CSS();
    const page = readFileSync(
      join(REPO, "components/landing/landing-page.tsx"),
      "utf8"
    );
    expect(page).toContain("roal-hero__stage");
    expect(css).toMatch(/\.roal-hero__stage[\s\S]*backdrop-filter:\s*blur/);
    expect(css).toContain(".home-video-layer__video");
  });

  it("constrains hero stack width and pill on narrow phones", () => {
    const css = CSS();
    expect(css).toContain(".roal-hero__copy");
    expect(css).toContain(".roal-hero__proof");
    expect(css).toMatch(
      /@media \(max-width: 640px\)[\s\S]*\.roal-hero__proof[\s\S]*width:\s*100%/
    );
    expect(css).toMatch(
      /@media \(max-width: 640px\)[\s\S]*\.roal-hero__stage[\s\S]*border-radius:\s*1\.05rem/
    );
  });

  it("adds tablet and desktop hero spacing bands", () => {
    const css = CSS();
    expect(css).toMatch(
      /@media \(max-width: 899px\)[\s\S]*\.roal-hero__stage/
    );
    expect(css).toMatch(
      /\.roal-hero__stage[\s\S]*width:\s*min\(73rem/
    );
  });
});
