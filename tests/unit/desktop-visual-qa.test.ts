import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");

describe("desktop visual QA hooks (landing pass)", () => {
  it("landing hero keeps frosted surface and warm palette without video layer", () => {
    const css = readFileSync(join(REPO, "app/landing-home.css"), "utf8");
    const page = readFileSync(join(REPO, "components/landing/landing-page.tsx"), "utf8");
    const shell = readFileSync(
      join(REPO, "components/landing/home/landing-home-shell.tsx"),
      "utf8"
    );

    expect(page).toContain("roal-hero__stage");
    expect(shell).not.toContain("LandingVideoBackground");
    expect(css).toContain("backdrop-filter: blur");
    expect(css).not.toMatch(/home-video-layer/);
    expect(css).toContain("--home-paper");
    expect(css).toContain("--home-red");
    expect(css).not.toMatch(/home-violet|home-cyan/);
  });

  it("landing hero stage uses compact desktop height band", () => {
    const css = readFileSync(join(REPO, "app/landing-home.css"), "utf8");
    expect(css).toMatch(/\.roal-hero__stage\s*\{[^}]*min-height:\s*clamp\(/s);
    expect(css).toMatch(/\.roal-hero\s*\{[^}]*min-height:\s*calc\(100(?:svh|dvh)\s*-\s*9rem\)/m);
  });

  it("final CTA keeps the pizzeria photo visible with readable body copy", () => {
    const page = readFileSync(join(REPO, "components/landing/landing-page.tsx"), "utf8");
    const css = readFileSync(join(REPO, "app/landing-home.css"), "utf8");

    expect(page).not.toContain("Live AI order call");
    expect(page).toContain("Live phone order");
    expect(page).toContain('className="roal-final-panel__lead"');
    expect(css).toMatch(/\.roal-final-panel__image\s*\{[^}]*opacity:\s*0\.94/s);
    expect(css).not.toMatch(
      /:is\([^)]*\.roal-final-panel p:not\(\.roal-kicker\)[^)]*\)[^{]*\{[^}]*--home-soft-ink/s
    );
    expect(css).toMatch(
      /\.roal-final-panel(?:__lead| p:not\(\.roal-kicker\))[\s\S]*?color:\s*rgb\(255 255 255/s
    );
    expect(css).toMatch(
      /\.roal-final-panel(?:__lead| p:not\(\.roal-kicker\))[\s\S]*?opacity:\s*1/s
    );
    expect(css).toMatch(
      /\.roal-final-panel(?:__lead| p:not\(\.roal-kicker\))[\s\S]*?text-shadow:/s
    );
    expect(css).not.toMatch(
      /\.roal-final-panel__lead\s*\{[^}]*--home-soft-ink/s
    );
  });
});

describe.skip("KDS dashboard hooks (out of landing pass scope)", () => {
  it("how-flow exposes desktop sticky stage grid", () => {
    const css = readFileSync(join(REPO, "app/landing-home.css"), "utf8");
    expect(css).toMatch(
      /@media \(min-width: 900px\)[\s\S]*\.home-how-flow__stage-col[\s\S]*display: block/
    );
    expect(css).toMatch(/grid-template-columns: minmax\(0, 0\.95fr\) minmax\(0, 1\.05fr\)/);
  });

  it("live agent route uses embedded panel without duplicate header", () => {
    const agent = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/agent/page.tsx"),
      "utf8"
    );
    const panel = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/VoiceAgentPanel.tsx"),
      "utf8"
    );
    const css = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/kds-workspace.css"),
      "utf8"
    );
    expect(agent).toContain("embedded");
    expect(agent).toContain("kds-workspace--agent");
    expect(panel).toContain("embedded?: boolean");
    expect(panel).toContain("kds-panel--embedded");
    expect(css).toContain(".kds-workspace--agent");
  });

  it("KDS orders canvas uses compact head without duplicate page header", () => {
    const page = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/page.tsx"),
      "utf8"
    );
    const panel = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/LiveOrdersPanel.tsx"),
      "utf8"
    );
    expect(page).not.toContain("<header");
    expect(panel).toContain("kds-orders-head");
    expect(panel).toContain("kds-orders-canvas");
  });
});
