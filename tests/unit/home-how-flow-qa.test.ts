import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");

function read(path: string): string {
  return readFileSync(join(REPO, path), "utf8");
}

describe("home how-flow scroll QA", () => {
  it("tracks visibility across steps and picks nearest-to-center beat", () => {
    const src = read("components/landing/home/how-flow/home-how-flow.tsx");
    expect(src).toContain("visibleRatios");
    expect(src).toContain("pickActiveBeat");
    expect(src).toContain("viewportCenter");
    expect(src).not.toMatch(/sort\(\(a, b\) => b\.intersectionRatio - a\.intersectionRatio\)/);
  });

  it("exposes static reduced-motion layout without scroll choreography", () => {
    const flow = read("components/landing/home/how-flow/home-how-flow.tsx");
    const css = read("app/landing-home.css");

    expect(flow).toContain("home-how-flow--static");
    expect(flow).toMatch(/!motionOk && "home-how-flow--static"/);
    expect(css).toContain(".home-how-flow--static .home-how-flow__steps");
    expect(css).toContain("grid-template-columns: repeat(2, minmax(0, 1fr))");
  });

  it("keeps active stage pane in document flow to avoid clipped visuals", () => {
    const css = read("app/landing-home.css");
    expect(css).toContain(".home-how-flow--motion .home-how-flow__stage-pane.is-active");
    expect(css).toMatch(/\.home-how-flow--motion \.home-how-flow__stage-pane\.is-active[\s\S]*position: relative/);
    expect(css).toMatch(/\.home-how-flow--motion \.home-how-flow__stage-pane\.is-active[\s\S]*z-index: 1/);
  });

  it("hides duplicate desktop stage from mobile assistive tech", () => {
    const flow = read("components/landing/home/how-flow/home-how-flow.tsx");
    expect(flow).toContain('aria-hidden={desktopStage ? undefined : true}');
  });
});
