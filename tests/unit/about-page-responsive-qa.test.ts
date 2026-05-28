import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ABOUT_PAGE_COPY } from "@/lib/landing/about-page-copy";

const REPO = join(import.meta.dirname, "../..");
const read = (rel: string) => readFileSync(join(REPO, rel), "utf8");

describe("about page responsive (prompt 11)", () => {
  it("states rush pain and ROAL answers in hero and pillars", () => {
    expect(ABOUT_PAGE_COPY.hero.description).toMatch(/miss/i);
    expect(ABOUT_PAGE_COPY.hero.description).toMatch(/ROAL answers/i);
    expect(ABOUT_PAGE_COPY.pillars.items[0].title).toBe("Missed calls");
    expect(ABOUT_PAGE_COPY.pillars.items[1].title).toBe("ROAL answers");
    for (const item of ABOUT_PAGE_COPY.pillars.items) {
      expect(item.body.length).toBeLessThanOrEqual(80);
    }
  });

  it("wraps page shell and highlights pain pillar without extra story sections", () => {
    const page = read("app/about/page.tsx");
    const content = read("components/landing/about/about-page-content.tsx");

    expect(page).toContain("public-about-page");
    expect(content).toContain("public-about-pillars__item--pain");
    expect(content).toContain("pillars.lead");
    expect(content).not.toContain("public-about-values");
    expect(content).not.toContain("public-about-story");
  });

  it("adds mobile about layout rules in public-theme.css", () => {
    const css = read("app/public-theme.css");
    expect(css).toContain("About page responsive (prompt 11)");
    expect(css).toMatch(
      /@media \(max-width: 767px\)[\s\S]*\.public-about-page \.public-marketing-hero \.landing-h1/
    );
    expect(css).toContain(".public-about-pillars__item--pain");
  });
});
