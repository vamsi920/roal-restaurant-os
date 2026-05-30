import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DASHBOARD_NAV,
  DASHBOARD_NAV_HREFS,
  isDashboardNavActive,
} from "@/lib/dashboard-nav";
import { RESTAURANT_LIST_NAV_LABEL } from "@/lib/dashboard-restaurant-labels";

const REPO = join(import.meta.dirname, "../..");

function dashboardPagePath(href: string): string {
  if (href === "/dashboard") return join(REPO, "app/dashboard/page.tsx");
  const sub = href.replace(/^\/dashboard\/?/, "");
  return join(REPO, "app/dashboard", sub, "page.tsx");
}

const OWNER_NAV_ITEMS = DASHBOARD_NAV.flatMap((g) => g.items).filter(
  (i) => !i.platformOnly
);

describe("dashboard nav owner-facing labels (prompt 33)", () => {
  it("Locations is the primary work entry after login", () => {
    const locations = DASHBOARD_NAV.flatMap((g) => g.items).find(
      (i) => i.href === "/dashboard/restaurants"
    );
    expect(locations?.label).toBe(RESTAURANT_LIST_NAV_LABEL);
    expect(locations?.description).toContain("workspace");
    const ownerHrefs = OWNER_NAV_ITEMS.map((i) => i.href);
    expect(ownerHrefs).not.toContain("/dashboard/analytics");
    expect(ownerHrefs).not.toContain("/dashboard/billing");
    expect(ownerHrefs).toContain("/dashboard/overview");
  });

  it("owner nav avoids legacy admin and staff-management wording", () => {
    for (const item of OWNER_NAV_ITEMS) {
      expect(item.label).not.toMatch(/admin ops|staff management/i);
      expect(item.description).not.toMatch(/admin ops|staff management/i);
      expect(item.label).not.toBe("Admin / Ops");
      expect(item.badge).toBeUndefined();
    }
    const labels = OWNER_NAV_ITEMS.map((i) => i.label).join(" ");
    const descriptions = OWNER_NAV_ITEMS.map((i) => i.description).join(" ");
    expect(labels).not.toMatch(/\bKDS\b/);
    expect(descriptions).not.toMatch(/\bKDS\b/);
  });

  it("platform support is internal-only nav copy", () => {
    const platform = DASHBOARD_NAV.flatMap((g) => g.items).find(
      (i) => i.href === "/dashboard/admin"
    );
    expect(platform?.label).toBe("Platform");
    expect(platform?.platformOnly).toBe(true);
    expect(platform?.label).not.toBe("Admin / Ops");
    expect(platform?.badge).toBeUndefined();
  });
});

describe("dashboard nav routes", () => {
  it("each nav href has a page.tsx", () => {
    for (const href of DASHBOARD_NAV_HREFS) {
      expect(existsSync(dashboardPagePath(href)), href).toBe(true);
    }
  });
});

describe("isDashboardNavActive", () => {
  it("highlights locations on list and all restaurant workspace routes", () => {
    expect(isDashboardNavActive("/dashboard/restaurants", "/dashboard/restaurants")).toBe(true);
    expect(
      isDashboardNavActive("/dashboard/restaurants", "/dashboard/restaurants/abc")
    ).toBe(true);
    expect(
      isDashboardNavActive(
        "/dashboard/restaurants",
        "/dashboard/restaurants/abc/analytics"
      )
    ).toBe(true);
    expect(
      isDashboardNavActive(
        "/dashboard/restaurants",
        "/dashboard/restaurants/abc/billing"
      )
    ).toBe(true);
  });

  it("highlights settings on notification sub-route", () => {
    expect(
      isDashboardNavActive("/dashboard/settings", "/dashboard/settings/notifications")
    ).toBe(true);
    expect(isDashboardNavActive("/dashboard/settings", "/dashboard/settings")).toBe(true);
  });

  it("owner sidebar omits org analytics, billing, and setup-only routes", () => {
    const hrefs = OWNER_NAV_ITEMS.map((i) => i.href);
    expect(hrefs).not.toContain("/dashboard/onboarding");
    expect(hrefs).not.toContain("/dashboard/settings/notifications");
    expect(hrefs).not.toContain("/dashboard/support");
    expect(hrefs).not.toContain("/dashboard/analytics");
    expect(hrefs).not.toContain("/dashboard/billing");
    expect(OWNER_NAV_ITEMS.length).toBe(3);
  });

  it("overview nav is owner/manager only", () => {
    const overview = DASHBOARD_NAV.flatMap((g) => g.items).find(
      (i) => i.href === "/dashboard/overview"
    );
    expect(overview?.orgAdminOnly).toBe(true);
    expect(overview?.label).toBe("Overview");
  });

  it("platform nav stays internal-only", () => {
    expect(isDashboardNavActive("/dashboard/admin", "/dashboard/admin")).toBe(true);
    const platform = DASHBOARD_NAV.flatMap((g) => g.items).find(
      (i) => i.href === "/dashboard/admin"
    );
    expect(platform?.platformOnly).toBe(true);
  });
});
