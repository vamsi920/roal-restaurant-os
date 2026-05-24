import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");

describe("pricing visual QA", () => {
  it("uses pilot setup block instead of duplicate what-counts prose", () => {
    const pilot = readFileSync(
      join(REPO, "components/landing/pricing/pricing-pilot-setup.tsx"),
      "utf8"
    );
    expect(pilot).toContain("public-pricing-pilot__steps");
    expect(pilot).not.toContain("what-counts");
  });

  it("uses narrow editorial layout wrapper", () => {
    const content = readFileSync(
      join(REPO, "components/landing/pricing/pricing-page-content.tsx"),
      "utf8"
    );
    const css = readFileSync(join(REPO, "app/public-theme.css"), "utf8");

    expect(content).toContain("public-pricing-page");
    expect(content).toContain('variant="glass"');
    expect(css).toContain(".public-pricing-page .landing-wrap");
  });
});
