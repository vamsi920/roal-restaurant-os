import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");
const read = (rel: string) => readFileSync(join(REPO, rel), "utf8");

describe("Analytics responsive (prompt 36)", () => {
  it("structures dashboard regions and card table for by-location", () => {
    const dash = read("components/analytics/AnalyticsDashboard.tsx");
    const css = read("app/dashboard-theme.css");

    expect(dash).toContain("analytics-dashboard");
    expect(dash).toContain("analytics-dashboard__stats");
    expect(dash).toContain("analytics-dashboard__chart-scroll");
    expect(dash).toContain("analytics-dashboard__location-table dashboard-table");
    expect(dash).toContain('data-label="Location"');
    expect(css).toContain("Analytics dashboard responsive (prompt 36)");
  });

  it("makes range picker and chart scroll friendly on small screens", () => {
    const picker = read("components/analytics/AnalyticsRangePicker.tsx");
    const chart = read("components/analytics/OrdersTrendChart.tsx");

    expect(picker).toContain("analytics-range-picker");
    expect(picker).toContain("flex-1");
    expect(picker).toContain("min-h-11");
    expect(chart).toContain("orders-trend-chart__scroll");
    expect(chart).toContain("overflow-x-auto");
    expect(chart).toContain("overscroll-x-contain");
  });

  it("loads real analytics snapshots without demo placeholders", () => {
    const orgPage = read("app/dashboard/analytics/page.tsx");
    const dash = read("components/analytics/AnalyticsDashboard.tsx");

    expect(orgPage).toContain("loadOrganizationAnalytics");
    expect(dash).toContain("snapshot.");
    expect(dash).toContain("No activity in this range");
    expect(dash).not.toMatch(/lorem|fake metrics|demo revenue/i);
  });
});
