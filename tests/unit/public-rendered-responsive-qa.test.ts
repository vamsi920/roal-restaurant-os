import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");

describe("Public rendered responsive QA (prompt 39)", () => {
  it("ships playwright sweep for required viewports and routes", () => {
    const script = readFileSync(
      join(REPO, "scripts/qa-public-responsive-sweep.mjs"),
      "utf8"
    );
    const pkg = readFileSync(join(REPO, "package.json"), "utf8");

    expect(pkg).toContain("qa:public-responsive-sweep");
    expect(script).toContain("320, height: 700");
    expect(script).toContain("390, height: 844");
    expect(script).toContain("768, height: 1024");
    expect(script).toContain("1024, height: 768");
    expect(script).toContain("1440, height: 900");
    expect(script).toContain("/blog/why-restaurants-miss-calls-dinner-rush");
    expect(script).toContain("/privacy");
    expect(script).toContain("/signup");
  });

  it("applies prompt 39 public touch and type guards in CSS", () => {
    const theme = readFileSync(join(REPO, "app/public-theme.css"), "utf8");
    const home = readFileSync(join(REPO, "app/landing-home.css"), "utf8");

    expect(theme).toContain("Public rendered QA touch + type (prompt 39)");
    expect(theme).toContain("max(0.8125rem, 11px)");
    expect(home).toContain("min-height: 2.75rem");
    expect(home).toContain("min-width: 2.75rem");
  });
});
