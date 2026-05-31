import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");
const read = (rel: string) => readFileSync(join(REPO, rel), "utf8");

describe("home hero background (restaurant landing)", () => {
  it("uses a premium video layer over the lavender paper canvas", () => {
    const css = read("app/landing-home.css");
    expect(css).toMatch(/home-video-layer|roal-bg-drift/);
    expect(css).not.toMatch(/home-violet|home-cyan|home-blue|home-lime/);
    expect(css).toMatch(
      /\.landing-home\.landing-home-canvas\s*\{[\s\S]*--home-paper:[\s\S]*--home-cream:/
    );
    expect(css).toMatch(
      /\.landing-home\.landing-home-canvas\s*\{[\s\S]*linear-gradient\(180deg, rgb\(var\(--home-paper\)\)/
    );
  });

  it("shell renders LandingVideoBackground", () => {
    const shell = read("components/landing/home/landing-home-shell.tsx");
    expect(shell).toContain("LandingVideoBackground");
    expect(shell).toContain("landing-video-bg");
  });

  it("keeps reduced-motion safe with video hooks", () => {
    const css = read("app/landing-home.css");
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
    expect(css).toMatch(/animation-duration:\s*0\.001ms/);
  });

  it("landing page references all three restaurant images", () => {
    const page = read("components/landing/landing-page.tsx");
    for (const image of [
      "/landing/hero-restaurant-counter.png",
      "/landing/menu-food-grid.png",
      "/landing/final-cta-pizzeria.png",
    ]) {
      expect(page).toContain(image);
    }
  });
});
