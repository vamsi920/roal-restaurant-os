import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");

describe("desktop visual QA hooks (prompt 38)", () => {
  it("landing hero keeps video layer and frosted surface", () => {
    const css = readFileSync(join(REPO, "app/landing-home.css"), "utf8");
    const hero = readFileSync(
      join(REPO, "components/landing/home/landing-home-hero.tsx"),
      "utf8"
    );
    expect(hero).toContain("home-hero__surface");
    expect(css).toContain(".home-video-layer--has-video .home-video-layer__video");
    expect(css).toContain("backdrop-filter: blur");
  });

  it("how-flow exposes desktop sticky stage grid", () => {
    const css = readFileSync(join(REPO, "app/landing-home.css"), "utf8");
    expect(css).toMatch(/@media \(min-width: 900px\)[\s\S]*\.home-how-flow__stage-col[\s\S]*display: block/);
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
