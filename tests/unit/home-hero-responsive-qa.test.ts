import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");
const CSS = () => readFileSync(join(REPO, "app/landing-home.css"), "utf8");

describe("home hero responsive (restaurant landing)", () => {
  it("keeps frosted surface with the premium video background layer", () => {
    const css = CSS();
    const page = readFileSync(
      join(REPO, "components/landing/landing-page.tsx"),
      "utf8"
    );
    const shell = readFileSync(
      join(REPO, "components/landing/home/landing-home-shell.tsx"),
      "utf8"
    );

    expect(page).toContain("roal-hero__stage");
    expect(shell).toContain("LandingVideoBackground");
    expect(css).toMatch(/\.roal-hero__stage[\s\S]*backdrop-filter:\s*blur/);
    expect(css).toMatch(/home-video-layer/);
    expect(css).toContain("--home-paper");
    expect(css).toContain("--home-cream");
    expect(css).not.toMatch(/home-violet|home-cyan|home-blue|home-lime/);
  });

  it("constrains hero stack width on narrow phones", () => {
    const css = CSS();
    expect(css).toContain(".roal-hero__copy");
    expect(css).toMatch(
      /@media \(max-width: 640px\)[\s\S]*\.roal-hero__stage[\s\S]*border-radius:\s*1\.05rem/
    );
    expect(css).toMatch(
      /@media \(max-width: 640px\)[\s\S]*\.roal-hero__lead[\s\S]*-webkit-line-clamp:\s*2/
    );
  });

  it("adds tablet and desktop hero spacing bands", () => {
    const css = CSS();
    expect(css).toMatch(
      /@media \(max-width: 899px\)[\s\S]*\.roal-hero__stage/
    );
    expect(css).toMatch(/\.roal-hero__stage[\s\S]*width:\s*min\(73rem/);
    expect(css).toMatch(/\.roal-hero__stage\s*\{[^}]*min-height:\s*clamp\(/s);
  });
});
