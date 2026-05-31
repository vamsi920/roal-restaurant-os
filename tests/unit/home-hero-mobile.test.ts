import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");
const homeCss = () => readFileSync(join(REPO, "app/landing-home.css"), "utf8");

describe("home hero mobile (prompt 28)", () => {
  it("uses a sub-viewport hero height so the next section peeks", () => {
    const css = homeCss();
    expect(css).toMatch(
      /\.roal-hero\s*\{[^}]*min-height:\s*calc\(100(?:svh|dvh)\s*-\s*9rem\)/m
    );
    expect(css).toContain("@media (max-width: 899px)");
    expect(css).toMatch(
      /@media \(max-width: 899px\)[\s\S]*\.roal-hero\s*\{[^}]*min-height:\s*auto/m
    );
  });

  it("prevents horizontal overflow and frames video on phones", () => {
    const css = homeCss();
    expect(css).toMatch(
      /\.landing-home\.landing-home-canvas\s*\{[^}]*overflow-x:\s*clip/m
    );
    expect(css).toMatch(
      /@media \(max-width: 767px\)[\s\S]*\.home-video-layer__video\s*\{[^}]*object-position:\s*center/m
    );
    expect(css).toMatch(
      /@media \(max-width: 640px\)[\s\S]*\.roal-hero__stage\s*\{[^}]*border-radius:\s*1\.05rem/m
    );
  });

  it("keeps hero CTAs full-width with touch-friendly height on phones", () => {
    const css = homeCss();
    expect(css).toMatch(
      /@media \(max-width: 640px\)[\s\S]*\.roal-hero__actions \.roal-button[\s\S]*min-height:\s*2\.85rem/m
    );
  });
});
