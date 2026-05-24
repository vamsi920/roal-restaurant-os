import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DASHBOARD_NAV_HREFS,
  isDashboardNavActive,
} from "@/lib/dashboard-nav";

const REPO = join(import.meta.dirname, "../..");

function dashboardPagePath(href: string): string {
  if (href === "/dashboard") return join(REPO, "app/dashboard/page.tsx");
  const sub = href.replace(/^\/dashboard\/?/, "");
  return join(REPO, "app/dashboard", sub, "page.tsx");
}

describe("dashboard nav routes", () => {
  it("each nav href has a page.tsx", () => {
    for (const href of DASHBOARD_NAV_HREFS) {
      expect(existsSync(dashboardPagePath(href)), href).toBe(true);
    }
  });
});

describe("isDashboardNavActive", () => {
  it("highlights overview only on exact /dashboard", () => {
    expect(isDashboardNavActive("/dashboard", "/dashboard")).toBe(true);
    expect(isDashboardNavActive("/dashboard", "/dashboard/restaurants")).toBe(false);
  });

  it("highlights restaurants on list and detail", () => {
    expect(isDashboardNavActive("/dashboard/restaurants", "/dashboard/restaurants")).toBe(true);
    expect(
      isDashboardNavActive("/dashboard/restaurants", "/dashboard/restaurants/abc")
    ).toBe(true);
  });

  it("prefers notifications over settings on nested path", () => {
    expect(
      isDashboardNavActive("/dashboard/settings/notifications", "/dashboard/settings/notifications")
    ).toBe(true);
    expect(
      isDashboardNavActive("/dashboard/settings", "/dashboard/settings/notifications")
    ).toBe(false);
    expect(isDashboardNavActive("/dashboard/settings", "/dashboard/settings")).toBe(true);
  });

  it("highlights sibling nav items on their routes", () => {
    expect(isDashboardNavActive("/dashboard/analytics", "/dashboard/analytics")).toBe(true);
    expect(isDashboardNavActive("/dashboard/onboarding", "/dashboard/onboarding")).toBe(true);
    expect(isDashboardNavActive("/dashboard/billing", "/dashboard/billing")).toBe(true);
    expect(isDashboardNavActive("/dashboard/support", "/dashboard/support")).toBe(true);
    expect(isDashboardNavActive("/dashboard/admin", "/dashboard/admin")).toBe(true);
  });

  it("keeps restaurants active on KDS and menu editor paths", () => {
    expect(
      isDashboardNavActive("/dashboard/restaurants", "/dashboard/restaurants/uuid/menu")
    ).toBe(true);
    expect(isDashboardNavActive("/dashboard/restaurants", "/dashboard/restaurants/uuid")).toBe(
      true
    );
    expect(isDashboardNavActive("/dashboard", "/dashboard/restaurants/uuid")).toBe(false);
  });
});
