import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");
const read = (rel: string) => readFileSync(join(REPO, rel), "utf8");

describe("restaurants list responsive (prompt 20)", () => {
  it("formats load errors and uses responsive grid classes", () => {
    const page = read("app/dashboard/restaurants/page.tsx");
    expect(page).toContain("formatSupabaseClientError");
    expect(page).toContain("overflow-x-clip");
    expect(page).toContain("md:grid-cols-2");
    expect(page).toContain("2xl:grid-cols-4");
  });

  it("makes each card a single large tap target with truncated title", () => {
    const page = read("app/dashboard/restaurants/page.tsx");
    expect(page).toMatch(/<Link[\s\S]*className=\{cn\([\s\S]*locations-card/);
    expect(page).toContain("locations-card__title");
    expect(page).toContain("title={restaurant.name}");
    expect(page).toContain('aria-label={`Open ${restaurant.name}`}');
  });

  it("aligns loading and state panels with card layout", () => {
    const page = read("app/dashboard/restaurants/page.tsx");
    expect(page).toContain("locations-card-skeleton");
    expect(page).toContain("locations-page__state--error");
    expect(page).toContain("locations-page__state--empty");
    expect(page).toContain('role="alert"');
    expect(page).not.toMatch(/skeleton min-h-11[\s\S]*skeleton min-h-11/);
  });

  it("styles list overflow and long names in dashboard theme", () => {
    const css = read("app/dashboard-theme.css");
    expect(css).toContain("Restaurants list responsive (prompt 20)");
    expect(css).toContain(".locations-page__error-text");
    expect(css).toContain(".locations-card:focus-visible");
  });
});
