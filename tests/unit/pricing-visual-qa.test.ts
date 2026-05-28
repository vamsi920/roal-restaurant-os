import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");

describe("pricing visual QA", () => {
  it("renders order explainer before pilot setup", () => {
    const content = readFileSync(
      join(REPO, "components/landing/pricing/pricing-page-content.tsx"),
      "utf8"
    );
    const explainer = readFileSync(
      join(REPO, "components/landing/pricing/pricing-order-explainer.tsx"),
      "utf8"
    );
    expect(content).toContain("PricingOrderExplainer");
    expect(explainer).toContain("public-pricing-orders");
    expect(explainer).not.toContain("Counts as one");
    expect(explainer).not.toContain("Never billed");
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
