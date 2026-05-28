import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ABOUT_PAGE_COPY } from "@/lib/landing/about-page-copy";

const REPO = join(import.meta.dirname, "../..");

function countLandingSections(source: string) {
  return (source.match(/<LandingSection/g) ?? []).length;
}

describe("about page copy (prompt 49)", () => {
  it("hero states rush-hour pain point and ROAL answers", () => {
    expect(ABOUT_PAGE_COPY.hero.title).toMatch(/rush/i);
    expect(ABOUT_PAGE_COPY.hero.description).toMatch(/miss/i);
    expect(ABOUT_PAGE_COPY.hero.description).toMatch(/ROAL answers/i);
  });

  it("uses one direct pillars section and four themes", () => {
    const content = readFileSync(
      join(REPO, "components/landing/about/about-page-content.tsx"),
      "utf8"
    );
    expect(content).toContain("public-about-pillars");
    expect(content).not.toContain("AboutCompanyStory");
    expect(content).not.toContain("public-about-promise");
    expect(countLandingSections(content)).toBe(1);

    const titles = ABOUT_PAGE_COPY.pillars.items.map((i) => i.title);
    expect(titles).toEqual([
      "Missed calls",
      "ROAL answers",
      "Kitchen ticket",
      "Pay per order",
    ]);
  });
});
