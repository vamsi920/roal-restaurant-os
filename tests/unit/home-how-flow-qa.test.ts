import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { HOME_HOW_FLOW } from "@/lib/landing/home-how-flow-copy";

const REPO = join(import.meta.dirname, "../..");

function read(path: string): string {
  return readFileSync(join(REPO, path), "utf8");
}

describe("home how-flow scroll QA", () => {
  it("uses three plain beats (prompt 30)", () => {
    expect(HOME_HOW_FLOW.beats).toHaveLength(3);
    const titles = HOME_HOW_FLOW.beats.map((b) => b.title);
    expect(titles).toEqual(["Add your menu", "Test the phone agent", "Go live for rush"]);

    const copy = read("lib/landing/home-how-flow-copy.ts");
    expect(copy).toContain('"share-menu"');
    expect(copy).toContain('"connect-line"');
    expect(copy).toContain('"kitchen-orders"');
    expect(copy).not.toContain("guest-orders");
    expect(copy).not.toContain("ticket-lands");

    const flow = read("components/landing/home/how-flow/home-how-flow.tsx");
    const stage = read("components/landing/home/how-flow/how-flow-stage.tsx");
    expect(flow).toContain("home-how-flow__story");
    expect(stage).toContain("HowFlowConnectVisual");
  });

  it("tracks visibility across steps and picks nearest-to-center beat", () => {
    const src = read("components/landing/home/how-flow/home-how-flow.tsx");
    expect(src).toContain("visibleRatios");
    expect(src).toContain("pickActiveBeat");
    expect(src).toContain("viewportCenter");
    expect(src).not.toMatch(/sort\(\(a, b\) => b\.intersectionRatio - a\.intersectionRatio\)/);
  });

  it("uses restrained scroll thresholds", () => {
    const src = read("components/landing/home/how-flow/home-how-flow.tsx");
    expect(src).toContain("threshold: [0, 0.35, 0.65, 1]");
    expect(src).toContain("-28% 0px -28% 0px");
  });

  it("exposes static reduced-motion layout without scroll choreography", () => {
    const flow = read("components/landing/home/how-flow/home-how-flow.tsx");
    const css = read("app/landing-home.css");

    expect(flow).toContain("home-how-flow--static");
    expect(flow).toMatch(/!motionOk && "home-how-flow--static"/);
    expect(css).toContain(".home-how-flow--static .home-how-flow__steps");
    expect(css).toContain("grid-template-columns: repeat(3, minmax(0, 1fr))");
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

  it("uses compact mobile story and tablet/desktop layout modes (responsive UI prompt 09)", () => {
    const flow = read("components/landing/home/how-flow/home-how-flow.tsx");
    const css = read("app/landing-home.css");

    expect(flow).toContain("home-how-flow--compact");
    expect(flow).toContain("home-how-flow--tablet");
    expect(flow).toContain("showStoryChrome");
    expect(flow).toContain("MOBILE_STORY_MQ");

    expect(css).toContain("How it works responsive flow (prompt 09)");
    expect(css).toMatch(
      /\.home-how-flow--compact[\s\S]*\.home-how-flow__step:not\(\.is-active\) \.home-how-flow__step-body[\s\S]*max-height:\s*none/
    );
    expect(css).toMatch(
      /\.home-how-flow--tablet \.home-how-flow__step[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\) minmax\(0,\s*1fr\)/
    );

    expect(HOME_HOW_FLOW.lead).toMatch(/owners/i);
    expect(HOME_HOW_FLOW.beats[2].body).toMatch(/kitchen screen/i);
  });
});
