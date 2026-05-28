import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");

describe("typography stack (prompt 41)", () => {
  it("loads Plus Jakarta Sans, not Inter or Fraunces", () => {
    const layout = readFileSync(join(REPO, "app/layout.tsx"), "utf8");
    expect(layout).toContain("Plus_Jakarta_Sans");
    expect(layout).not.toContain("Fraunces");
    expect(layout).not.toContain("DM_Sans");
    expect(layout).not.toContain("Inter");
  });

  it("uses unified sans tokens for body and display", () => {
    const typeCss = readFileSync(join(REPO, "app/typography.css"), "utf8");
    const tailwind = readFileSync(join(REPO, "tailwind.config.ts"), "utf8");
    expect(typeCss).toContain("--type-body");
    expect(typeCss).toContain("--type-display");
    expect(typeCss).toContain("Plus Jakarta Sans");
    expect(typeCss).not.toContain("Fraunces");
    expect(typeCss).not.toMatch(/next\/font.*Inter|font-family:.*Inter/i);
    expect(tailwind).toContain("var(--type-display)");
    expect(tailwind).toContain("var(--type-body)");
    expect(tailwind).not.toContain("Fraunces");
  });

  it("defines type scale and dashboard mapping", () => {
    const typeCss = readFileSync(join(REPO, "app/typography.css"), "utf8");
    expect(typeCss).toContain("--text-display-size");
    expect(typeCss).toContain("--text-section-size");
    expect(typeCss).toContain("--text-numeric-size");
    expect(typeCss).toContain(".type-numeric");
    expect(typeCss).toContain("tabular-nums");
    expect(typeCss).toContain("#app-main-content h1");
    expect(typeCss).toContain("text-wrap: balance");
    expect(typeCss).toContain("text-wrap: pretty");
  });

  it("public marketing uses hero scale and readable measure (prompt 35)", () => {
    const publicTheme = readFileSync(join(REPO, "app/public-theme.css"), "utf8");
    const homeCss = readFileSync(join(REPO, "app/landing-home.css"), "utf8");
    const typeCss = readFileSync(join(REPO, "app/typography.css"), "utf8");

    expect(typeCss).toContain("--text-hero-size");
    expect(typeCss).toContain("--text-readable-max");
    expect(publicTheme).toContain("--public-text-display: var(--text-hero-size)");
    expect(publicTheme).toContain("--public-readable-max: var(--text-readable-max)");
    expect(publicTheme).not.toMatch(
      /--public-text-(?:display|h2|lead|body|eyebrow):[^;]*(?:4\.25rem|4\.5rem)/
    );
    expect(publicTheme).toContain("max-width: min(var(--public-readable-max)");

    expect(homeCss).toContain("line-height: var(--text-hero-leading)");
    expect(homeCss).toContain("max-width: min(var(--public-readable-max)");
    expect(homeCss).not.toMatch(
      /\.home-(?:display|hero__title|h2|lead|pricing-teaser__amount)[^{]*\{[^}]*(?:4\.5rem|8\.5vw,\s*4\.5rem|3\.25rem)/
    );
  });

  it("defines responsive caption/micro scale (prompt 03)", () => {
    const typeCss = readFileSync(join(REPO, "app/typography.css"), "utf8");
    const tailwind = readFileSync(join(REPO, "tailwind.config.ts"), "utf8");
    expect(typeCss).toContain("--text-caption-size");
    expect(typeCss).toContain("--text-micro-size");
    expect(typeCss).toContain(".type-caption");
    expect(typeCss).toContain(".type-micro");
    expect(typeCss).toContain(".type-eyebrow");
    expect(tailwind).toContain('caption:');
    expect(tailwind).toContain('micro:');
  });

  it("dashboard and marketing TSX avoid raw 10px/11px classes (prompt 03)", () => {
    const panel = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/VoiceAgentPanel.tsx"),
      "utf8"
    );
    const hero = readFileSync(
      join(REPO, "components/landing/home/landing-home-hero.tsx"),
      "utf8"
    );
    expect(panel).toContain("text-micro");
    expect(panel).not.toContain("text-[10px]");
    expect(hero).toContain("home-display");
  });
});
