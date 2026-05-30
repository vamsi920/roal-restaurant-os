import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");

describe("landing home sections (prompt 29)", () => {
  it("keeps only layman-focused blocks below the hero", () => {
    const page = readFileSync(join(REPO, "components/landing/landing-page.tsx"), "utf8");

    for (const block of [
      "HomeProductIntro",
      "HomeProductProof",
      "HomeHowItWorks",
      "HomePay",
      "HomeFaq",
      "HomeCtaBand",
    ]) {
      expect(page).toContain(block);
    }

    for (const removed of [
      "HomeMetricsStrip",
      "HomeSolution",
      "HomeCapabilitiesStrip",
      "HomeSavingsCard",
    ]) {
      expect(page).not.toContain(removed);
    }
  });
});
