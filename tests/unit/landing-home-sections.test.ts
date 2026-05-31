import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");

describe("landing home sections (restaurant landing)", () => {
  it("keeps layman-focused blocks below the hero", () => {
    const page = readFileSync(join(REPO, "components/landing/landing-page.tsx"), "utf8");

    for (const block of [
      "rushStory",
      "setupSteps",
      "ticketRows",
      "faqs",
      "roal-pay-panel",
      "roal-final-panel",
    ]) {
      expect(page).toContain(block);
    }

    for (const removed of [
      "HomeMetricsStrip",
      "HomeSolution",
      "HomeCapabilitiesStrip",
      "HomeSavingsCard",
    ]) {
      expect(page).not.toContain(removed);
    }
  });

  it("uses all three landing images in the page story", () => {
    const page = readFileSync(join(REPO, "components/landing/landing-page.tsx"), "utf8");
    for (const image of [
      "/landing/hero-restaurant-counter.png",
      "/landing/menu-food-grid.png",
      "/landing/final-cta-pizzeria.png",
    ]) {
      expect(page).toContain(image);
    }
  });

  it("labels the hero call card with live phone order copy", () => {
    const page = readFileSync(join(REPO, "components/landing/landing-page.tsx"), "utf8");
    expect(page).toContain("Live phone order");
    expect(page).not.toContain("Live AI order call");
  });

  it("styles the final CTA paragraph for readable contrast over the photo", () => {
    const page = readFileSync(join(REPO, "components/landing/landing-page.tsx"), "utf8");
    const css = readFileSync(join(REPO, "app/landing-home.css"), "utf8");

    expect(page).toContain('className="roal-final-panel__lead"');
    expect(css).toMatch(/\.roal-final-panel__lead\s*\{[^}]*color:\s*rgb\(/s);
    expect(css).toMatch(/\.roal-final-panel__lead\s*\{[^}]*opacity:\s*1/s);
    expect(css).toMatch(/\.roal-final-panel__lead\s*\{[^}]*text-shadow:/s);
  });

  it("avoids banned section modifiers and keeps pricing/final hooks", () => {
    const page = readFileSync(join(REPO, "components/landing/landing-page.tsx"), "utf8");
    for (const banned of [
      "roal-section--pain",
      "roal-section--flow",
      "roal-section--ticket",
      "roal-section--metrics",
      "roal-section--faq",
    ]) {
      expect(page).not.toContain(banned);
    }
    expect(page).toContain("roal-section--pricing");
    expect(page).toContain("roal-section--final");
  });
});
