import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DASHBOARD_NAV,
  DASHBOARD_NAV_HREFS,
  buildLocationNav,
  isDashboardNavActive,
  isLocationNavActive,
  resolveCurrentRestaurantId,
  restaurantIdFromPath,
  switchLocationHref,
  visibleOrgNav,
} from "@/lib/dashboard-nav";
import { buildShellLocations, shellLocationStatus } from "@/lib/dashboard/shell-data";

const REPO = join(import.meta.dirname, "../..");
const ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const BASE = `/dashboard/restaurants/${ID}`;

function dashboardPagePath(href: string): string {
  if (href === "/dashboard") return join(REPO, "app/dashboard/page.tsx");
  const sub = href.replace(/^\/dashboard\/?/, "");
  return join(REPO, "app/dashboard", sub, "page.tsx");
}

const ORG_ITEMS = DASHBOARD_NAV.flatMap((g) => g.items).filter((i) => !i.platformOnly);

describe("location-scoped sidebar nav (v3)", () => {
  it("lists the location modules in order, all scoped to the location", () => {
    const nav = buildLocationNav(ID);
    expect(nav.map((i) => i.label)).toEqual([
      "Overview",
      "Calls & Orders",
      "Kitchen",
      "Menu",
      "Phone host",
      "Reports",
      "Billing",
      "Settings",
    ]);
    expect(nav.every((i) => i.href.startsWith(BASE))).toBe(true);
    expect(nav.find((i) => i.key === "overview")?.href).toBe(`${BASE}/overview`);
    expect(nav.find((i) => i.key === "kitchen")?.href).toBe(BASE);
    expect(nav.find((i) => i.key === "settings")?.href).toBe(`${BASE}/menu#restaurant-settings`);
  });

  it("shows a count on Phone host only when questions are pending", () => {
    expect(buildLocationNav(ID).find((i) => i.key === "host")?.count).toBeUndefined();
    expect(buildLocationNav(ID, { pendingQuestions: 3 }).find((i) => i.key === "host")?.count).toBe(3);
  });

  it("highlights exactly one module per route", () => {
    const active = (path: string, hash = "") =>
      buildLocationNav(ID)
        .filter((i) => isLocationNavActive(i.key, path, ID, hash))
        .map((i) => i.key);
    expect(active(BASE)).toEqual(["kitchen"]);
    expect(active(`${BASE}/overview`)).toEqual(["overview"]);
    expect(active(`${BASE}/calls`)).toEqual(["calls"]);
    expect(active(`${BASE}/menu`)).toEqual(["menu"]);
    expect(active(`${BASE}/menu`, "#restaurant-settings")).toEqual(["settings"]);
    expect(active(`${BASE}/agent`)).toEqual(["host"]);
    expect(active(`${BASE}/analytics`)).toEqual(["reports"]);
    expect(active(`${BASE}/billing`)).toEqual(["billing"]);
    expect(active(`/dashboard/restaurants/${OTHER}/menu`)).toEqual([]);
  });

  it("parses the location id from the path", () => {
    expect(restaurantIdFromPath(`${BASE}/calls`)).toBe(ID);
    expect(restaurantIdFromPath(BASE)).toBe(ID);
    expect(restaurantIdFromPath("/dashboard/restaurants")).toBeNull();
    expect(restaurantIdFromPath("/dashboard/settings")).toBeNull();
  });

  it("resolves current location: path, then remembered, then first", () => {
    const ids = [ID, OTHER];
    expect(resolveCurrentRestaurantId({ pathname: `/dashboard/restaurants/${OTHER}/menu`, remembered: ID, restaurantIds: ids })).toBe(OTHER);
    expect(resolveCurrentRestaurantId({ pathname: "/dashboard/settings", remembered: OTHER, restaurantIds: ids })).toBe(OTHER);
    expect(resolveCurrentRestaurantId({ pathname: "/dashboard/settings", remembered: "gone", restaurantIds: ids })).toBe(ID);
    expect(resolveCurrentRestaurantId({ pathname: "/dashboard/support", remembered: null, restaurantIds: [] })).toBeNull();
  });

  it("switching location keeps the module, else opens the overview", () => {
    expect(switchLocationHref(`${BASE}/menu`, ID, OTHER)).toBe(`/dashboard/restaurants/${OTHER}/menu`);
    expect(switchLocationHref(BASE, ID, OTHER)).toBe(`/dashboard/restaurants/${OTHER}`);
    expect(switchLocationHref("/dashboard/settings", ID, OTHER)).toBe(`/dashboard/restaurants/${OTHER}/overview`);
  });
});

describe("organization nav group", () => {
  it("is owner/manager only and uses plain labels", () => {
    expect(ORG_ITEMS.map((i) => i.label)).toEqual([
      "All locations",
      "Organization overview",
      "Team & settings",
    ]);
    expect(ORG_ITEMS.every((i) => i.orgAdminOnly)).toBe(true);
    for (const item of ORG_ITEMS) {
      expect(item.label).not.toMatch(/admin ops|staff management|\bKDS\b/i);
      expect(item.description).not.toMatch(/admin ops|staff management|\bKDS\b/i);
      expect(item.badge).toBeUndefined();
    }
  });

  it("filters by role", () => {
    expect(visibleOrgNav({ showAdminNav: false, showOrgAdminNav: false })).toEqual([]);
    const admin = visibleOrgNav({ showAdminNav: false, showOrgAdminNav: true });
    expect(admin.flatMap((g) => g.items).map((i) => i.href)).not.toContain("/dashboard/admin");
    const staff = visibleOrgNav({ showAdminNav: true, showOrgAdminNav: true });
    expect(staff.flatMap((g) => g.items).map((i) => i.href)).toContain("/dashboard/admin");
  });

  it("platform support is internal-only nav copy", () => {
    const platform = DASHBOARD_NAV.flatMap((g) => g.items).find((i) => i.href === "/dashboard/admin");
    expect(platform?.label).toBe("Platform");
    expect(platform?.platformOnly).toBe(true);
    expect(platform?.badge).toBeUndefined();
  });

  it("each org nav href has a page.tsx", () => {
    for (const href of DASHBOARD_NAV_HREFS) {
      expect(existsSync(dashboardPagePath(href)), href).toBe(true);
    }
    expect(existsSync(join(REPO, "app/dashboard/restaurants/[id]/overview/page.tsx"))).toBe(true);
  });

  it("isDashboardNavActive matches nested org routes but not location routes", () => {
    expect(isDashboardNavActive("/dashboard/settings", "/dashboard/settings/notifications")).toBe(true);
    expect(isDashboardNavActive("/dashboard/settings", "/dashboard/settings")).toBe(true);
    expect(isDashboardNavActive("/dashboard/restaurants", "/dashboard/restaurants")).toBe(true);
    expect(isDashboardNavActive("/dashboard/restaurants", BASE)).toBe(false);
    expect(isDashboardNavActive("/dashboard/admin", "/dashboard/admin")).toBe(true);
  });
});

describe("shell locations", () => {
  it("merges profile status and pending question counts", () => {
    const [a, b] = buildShellLocations({
      restaurants: [
        { id: ID, name: "Loman's Pizza", organization_id: "org" },
        { id: OTHER, name: "Second", organization_id: "org" },
      ],
      profiles: [
        { restaurant_id: ID, agent_display_name: " Addy ", temporarily_closed: true, elevenlabs_provision_status: "ready" },
      ],
      pendingQuestionRestaurantIds: [ID, ID],
      organizationNames: { org: "Loman Group" },
    });
    expect(a).toMatchObject({ isLive: true, temporarilyClosed: true, agentDisplayName: "Addy", pendingQuestions: 2, organizationName: "Loman Group" });
    expect(shellLocationStatus(a)).toBe("paused");
    expect(b).toMatchObject({ isLive: false, temporarilyClosed: false, pendingQuestions: 0 });
    expect(shellLocationStatus(b)).toBe("setup");
    expect(shellLocationStatus({ isLive: true, temporarilyClosed: false })).toBe("live");
  });
});
