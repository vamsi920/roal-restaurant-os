import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");
const read = (rel: string) => readFileSync(join(REPO, rel), "utf8");

describe("home hero density (restaurant landing)", () => {
  it("hero copy stays short and restaurant-specific", () => {
    const page = read("components/landing/landing-page.tsx");
    const titleMatch = page.match(/<h1[^>]*>\s*([\s\S]*?)<\/h1>/);
    expect(titleMatch).not.toBeNull();
    const title = titleMatch![1].replace(/\{[^}]+\}/g, "").replace(/<[^>]+>/g, "").trim();
    expect(title.split(/\s+/).length).toBeLessThanOrEqual(12);
    expect(title.toLowerCase()).toMatch(/never miss|phone order/);

    const leadMatch = page.match(/className="roal-hero__lead"[\s\S]*?>([\s\S]*?)<\/p>/);
    expect(leadMatch).not.toBeNull();
    const lead = leadMatch![1].replace(/\{[^}]+\}/g, "").replace(/<[^>]+>/g, "").trim();
    expect(lead.split(/\s+/).length).toBeLessThanOrEqual(32);
    expect(lead.toLowerCase()).toMatch(/kitchen|language/);
    expect(page.toLowerCase()).not.toContain("ai future");
    expect(page.toLowerCase()).not.toContain("your ai host");
    expect(page).toContain("Live phone order");
    expect(page).not.toContain("Live AI order call");
  });

  it("hero surfaces pricing and demo CTAs", () => {
    const page = read("components/landing/landing-page.tsx");
    expect(page).toContain("$0.90");
    expect(page).toContain("Hear a demo call");
    expect(page).toContain("roal-hero__price-note");
    expect(page).toMatch(/only after a real phone order/i);
  });

  it("hero layout uses compact frosted stage without legacy panels", () => {
    const page = read("components/landing/landing-page.tsx");
    const css = read("app/landing-home.css");
    const shell = read("components/landing/home/landing-home-shell.tsx");

    expect(page).toMatch(/<h1[\s>]/);
    expect(page).toContain("roal-hero__stage");
    expect(page).not.toContain("home-hero__qualifier");
    expect(page).not.toContain("home-glass-panel");
    expect(shell).toContain("LandingVideoBackground");

    expect(css).toMatch(/\.roal-hero\s*\{[^}]*padding:/s);
    expect(css).toContain(".roal-hero__stage");
    expect(css).toMatch(/\.roal-hero__stage\s*\{[^}]*backdrop-filter:\s*blur/s);
    expect(css).toMatch(/\.roal-hero__stage\s*\{[^}]*min-height:\s*clamp\(/s);
    expect(css).toMatch(/home-video-layer/);
  });
});
