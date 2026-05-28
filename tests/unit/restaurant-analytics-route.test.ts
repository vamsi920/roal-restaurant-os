import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");
const ANALYTICS_PAGE = join(
  REPO,
  "app/dashboard/restaurants/[id]/analytics/page.tsx"
);
const LOAD = join(REPO, "lib/analytics/load-analytics.ts");
const NAV = join(REPO, "lib/restaurant-workspace-nav.ts");
const RAIL = join(REPO, "app/dashboard/restaurants/[id]/RestaurantWorkspaceRail.tsx");
const DASH = join(REPO, "components/analytics/AnalyticsDashboard.tsx");

describe("restaurant analytics (prompt 19)", () => {
  it("exposes restaurant-scoped analytics route with tenant access", () => {
    const page = readFileSync(ANALYTICS_PAGE, "utf8");
    expect(page).toContain("getRestaurantAccessForPage");
    expect(page).toContain("loadRestaurantAnalytics");
    expect(page).toContain("RestaurantWorkspaceRail");
    expect(page).toContain("hasRestaurantAnalytics");
    expect(page).toContain("<AnalyticsDashboard");
    expect(page).not.toMatch(/seed|demo|placeholder|fake/i);
  });

  it("scopes analytics queries to one restaurant when requested", () => {
    const load = readFileSync(LOAD, "utf8");
    expect(load).toContain("loadRestaurantAnalytics");
    expect(load).toContain('usageQuery.eq("restaurant_id", input.restaurantId)');
    expect(load).toContain('importsQuery.eq("restaurant_id", input.restaurantId)');
    expect(load).toContain('? "restaurant"\n    : "organization"');
  });

  it("links analytics from workspace rail to restaurant route", () => {
    const nav = readFileSync(NAV, "utf8");
    const rail = readFileSync(RAIL, "utf8");
    expect(nav).toContain("hasRestaurantAnalytics");
    expect(nav).toContain("${base}/analytics");
    expect(rail).toContain("hasRestaurantAnalytics");
  });

  it("shows honest no-data and stored-outcome metrics only", () => {
    const dash = readFileSync(DASH, "utf8");
    expect(dash).toContain('snapshot.scope === "restaurant"');
    expect(dash).toContain("No activity in this range");
    expect(dash).toContain("Phone orders and call outcomes");
    expect(dash).not.toMatch(/page views|bounce rate|NPS|retention/i);
    expect(dash).not.toMatch(/seed|demo|fabricat/i);
  });
});
