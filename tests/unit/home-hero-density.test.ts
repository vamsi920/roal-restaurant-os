import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  HOME_CTA,
  HOME_HERO,
  HOME_HERO_CTA,
  HOME_HERO_PRICING_PILL,
  HOME_PRICING_PILL,
} from "@/lib/landing/home-theme";
import { PRICING_HERO_SIGNAL, PRICING_RATE_AMOUNT } from "@/lib/landing/pricing-core";
import { PUBLIC_CTA } from "@/lib/landing/public-cta";

const REPO = join(import.meta.dirname, "../..");

describe("home hero density (prompt 57)", () => {
  it("copy is one headline and one short subhead", () => {
    expect(HOME_HERO.title.split(/\s+/).length).toBeLessThanOrEqual(8);
    const words = HOME_HERO.lead.trim().split(/\s+/);
    expect(words.length).toBeLessThanOrEqual(12);
    expect(HOME_HERO.lead.toLowerCase()).toContain("kitchen");
    expect(HOME_HERO.title.toLowerCase()).not.toMatch(/never miss/);
    expect(HOME_HERO.title.toLowerCase()).toContain("roal");
    expect(HOME_HERO.lead.toLowerCase()).toMatch(/language/);
  });

  it("hero pricing signal uses configured rate", () => {
    expect(HOME_PRICING_PILL.label).toBe("$0.90/order");
    expect(HOME_HERO_PRICING_PILL.label).toBe(PRICING_HERO_SIGNAL);
    expect(PRICING_HERO_SIGNAL).toContain(PRICING_RATE_AMOUNT);
    expect(PRICING_HERO_SIGNAL.toLowerCase()).toContain("completed orders");

    const pill = readFileSync(
      join(REPO, "components/landing/home/landing-home-pricing-pill.tsx"),
      "utf8"
    );
    expect(pill).toContain("HOME_HERO_PRICING_PILL");
    expect(pill).toContain("home-pricing-pill__label");
    expect(pill).not.toContain("home-pricing-pill__sep");
  });

  it("hero has demo primary and sign-up secondary only", () => {
    expect(HOME_HERO_CTA.primary).toEqual(PUBLIC_CTA.hearDemo);
    expect(HOME_HERO_CTA.secondary).toEqual(PUBLIC_CTA.signUpOnboarding);
    expect(HOME_CTA.secondary).not.toEqual(HOME_HERO_CTA.secondary);

    const hero = readFileSync(
      join(REPO, "components/landing/home/landing-home-hero.tsx"),
      "utf8"
    );
    expect(hero).toContain("HOME_HERO_CTA");
  });

  it("hero renders h1, one lead, pill, and two CTAs only", () => {
    const hero = readFileSync(
      join(REPO, "components/landing/home/landing-home-hero.tsx"),
      "utf8"
    );
    expect(hero).toMatch(/<h1[\s>]/);
    expect((hero.match(/<p\b/g) ?? []).length).toBe(1);
    expect(hero).toContain("LandingHomePricingPill");
    expect(hero).toContain("LandingHomeCta");
    expect(hero).not.toContain("home-hero__qualifier");
    expect(hero).not.toContain("home-hero__footer");
    expect(hero).toContain("home-hero__surface");
    expect(hero).not.toContain("home-glass-panel");

    const homeCss = readFileSync(join(REPO, "app/landing-home.css"), "utf8");
    expect(homeCss).toMatch(/\.home-hero\s*\{[^}]*justify-content:\s*center/s);
    expect(homeCss).toContain(".home-hero__surface");
    expect(homeCss).toMatch(
      /\.home-hero__surface\s*\{[^}]*backdrop-filter:\s*blur/s
    );

    const cta = readFileSync(
      join(REPO, "components/landing/home/landing-home-cta.tsx"),
      "utf8"
    );
    expect(cta).toContain("showSecondary ?");
  });
});
