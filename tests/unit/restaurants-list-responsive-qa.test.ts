import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");
const read = (rel: string) => readFileSync(join(REPO, rel), "utf8");
/** Locations page = server page + client list + scoped loader (no browser DB access). */
const readLocations = () =>
  ["app/dashboard/restaurants/page.tsx", "app/dashboard/restaurants/LocationsList.tsx", "lib/restaurant-list/load-locations.ts"]
    .map(read)
    .join("\n");

describe("restaurants list responsive (prompt 20)", () => {
  it("formats load errors and uses responsive grid classes", () => {
    const page = readLocations();
    expect(page).toContain("formatSupabaseClientError");
    expect(page).toContain("overflow-x-clip");
    expect(page).toContain("md:grid-cols-2");
    expect(page).toContain("2xl:grid-cols-4");
    expect(page).toContain("locations-portfolio__grid");
    expect(page).toContain("grid-cols-2 gap-2 sm:grid-cols-3");
  });

  it("loads launch profile basics for card stats gate", () => {
    const page = readLocations();
    expect(page).toContain("loadRestaurantCardStats");
    expect(page).toMatch(
      /restaurant_id,\s*phone,\s*timezone,\s*address_line1,\s*allows_pickup,\s*allows_delivery/
    );
    expect(page).toContain("namesById");
  });

  it("uses accessible title links and portfolio summary before cards", () => {
    const page = readLocations();
    expect(page).toContain("locations-card__title");
    expect(page).toContain("title={restaurant.name}");
    expect(page).toContain('aria-label={`Open ${restaurant.name}`}');
    expect(page).toContain("PortfolioSummaryStrip");
    expect(page).toContain("locations-card__stats");
  });

  it("aligns loading and state panels with card layout", () => {
    const page = readLocations();
    expect(page).toContain("locations-card-skeleton");
    expect(page).toContain("locations-portfolio-skeleton");
    expect(page).toContain("locations-page__state--error");
    expect(page).toContain("locations-page__state--empty");
    expect(page).toContain('role="alert"');
  });

  it("styles list overflow and focus in dashboard theme", () => {
    const css = read("app/dashboard-theme.css");
    expect(css).toContain(".locations-page__error-text");
    expect(css).toContain(".locations-card__title-link:focus-visible");
    expect(css).toContain(".locations-portfolio__grid");
  });
});
