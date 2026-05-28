import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");

describe("demo page layout", () => {
  it("is one scroll without visible AEO or poster sections", () => {
    const page = readFileSync(join(REPO, "app/demo/page.tsx"), "utf8");
    const content = readFileSync(
      join(REPO, "components/landing/demo/demo-page-content.tsx"),
      "utf8"
    );
    expect(page).toContain("DemoPageHero");
    expect(page).toContain("demo-page.css");
    expect(page).not.toContain("MarketingPageHero");
    expect(content).toContain("DemoVideoPlaceholder");
    expect(content).toContain("DemoCallFlowSection");
    expect(content).toContain("DemoProofSection");
    expect(content).toContain("DemoCtaBand");
    expect(content).not.toContain("DemoAeoAnswer");
    expect(content).not.toContain("LandingSection");
  });

  it("hero CTA leads with mailto demo and signup", () => {
    const heroCta = readFileSync(
      join(REPO, "components/landing/demo/demo-page-hero-cta.tsx"),
      "utf8"
    );
    expect(heroCta).toContain("bookDemoCall");
    expect(heroCta).toContain("#demo-video");
  });

  it("call flow steps use progressive times from copy", () => {
    const sim = readFileSync(
      join(REPO, "components/landing/demo/demo-call-simulation.tsx"),
      "utf8"
    );
    expect(sim).toContain("callSimulation.steps");
    expect(sim).toContain("public-demo-flow");
    expect(sim).toContain("step.time");
    expect(sim).toContain("step.tagline");
  });

  it("proof section pairs transcript and ticket", () => {
    const proof = readFileSync(
      join(REPO, "components/landing/demo/demo-proof-section.tsx"),
      "utf8"
    );
    expect(proof).toContain("ConversationTranscript");
    expect(proof).toContain("KdsVisual");
    expect(proof).toContain("public-demo-proof__grid");
  });
});
