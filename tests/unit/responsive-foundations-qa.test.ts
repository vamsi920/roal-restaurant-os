import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");

describe("responsive foundations (prompt 02)", () => {
  it("globals define tap targets, overflow clip, and reduced motion", () => {
    const css = readFileSync(join(REPO, "app/globals.css"), "utf8");
    expect(css).toContain("--tap-target-min");
    expect(css).toContain("--safe-area-top");
    expect(css).toMatch(/html[\s\S]*overflow-x:\s*clip/);
    expect(css).toMatch(/body[\s\S]*overflow-x:\s*clip/);
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css).toContain(".pulse-dot::after");
    expect(css).toContain("overflow-wrap: anywhere");
  });

  it("public theme wires tap min and auth safe-area", () => {
    const css = readFileSync(join(REPO, "app/public-theme.css"), "utf8");
    expect(css).toContain("--public-tap-min");
    expect(css).toContain("touch-action: manipulation");
    expect(css).toMatch(
      /\.public-theme \.public-auth-main[\s\S]*safe-area-inset-bottom/
    );
  });

  it("marketing canvases clip horizontal overflow", () => {
    const landing = readFileSync(join(REPO, "app/landing.css"), "utf8");
    const home = readFileSync(join(REPO, "app/landing-home.css"), "utf8");
    expect(landing).toMatch(
      /\.landing-story\.landing-story-canvas[\s\S]*overflow-x:\s*clip/
    );
    expect(home).toMatch(/\.landing-home\.landing-home-canvas[\s\S]*overflow-x:\s*clip/);
    expect(home).toContain("scroll-padding-top");
  });

  it("dashboard theme extends focus, pre scroll, and safe-area main padding", () => {
    const css = readFileSync(join(REPO, "app/dashboard-theme.css"), "utf8");
    expect(css).toContain("summary:focus-visible");
    expect(css).toContain("#app-main-content pre");
    expect(css).toMatch(
      /\.app-shell-main[\s\S]*safe-area-inset-bottom/
    );
    expect(css).toContain("prefers-reduced-motion: reduce");
  });

  it("auth pages refine focus and reduced motion without layout rewrites", () => {
    const css = readFileSync(join(REPO, "app/auth-page.css"), "utf8");
    expect(css).toContain(".public-auth-submit:focus-visible");
    expect(css).toContain("overflow-x: clip");
    expect(css).toContain("prefers-reduced-motion: reduce");
  });
});
