import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildRestaurantWorkspaceNav } from "@/lib/restaurant-workspace-nav";

const REPO = join(import.meta.dirname, "../..");
const read = (rel: string) => readFileSync(join(REPO, rel), "utf8");
/** Locations page = server page + client list + scoped loader (no browser DB access). */
const readLocations = () =>
  ["app/dashboard/restaurants/page.tsx", "app/dashboard/restaurants/LocationsList.tsx", "lib/restaurant-list/load-locations.ts"]
    .map(read)
    .join("\n");

const RESTAURANT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const FOREIGN_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("dashboard restaurant workspace (pass 65)", () => {
  it("home opens a location overview (last used via cookie) or onboarding with no locations", () => {
    const home = read("app/dashboard/page.tsx");
    expect(home).toContain("/overview");
    expect(home).toContain("roal_last_restaurant");
    expect(home).toContain('redirect("/dashboard/onboarding")');
    expect(home).not.toContain('redirect("/dashboard/overview")');
    expect(home).not.toContain('redirect("/dashboard/restaurants")');
  });

  it("locations page loads restaurants from the database only", () => {
    const page = readLocations();
    expect(page).toContain('from("restaurants")');
    expect(page).toContain("loadRestaurantCardStats");
    expect(page).toContain("buildPortfolioSummary");
    expect(page).toContain("PortfolioSummaryStrip");
    expect(page).toContain("Organization portfolio");
    expect(page).not.toMatch(/const\s+restaurants\s*=\s*\[/);
    expect(page).not.toMatch(/demo|fake|seed|MOCK_/i);
  });

  it("locations page loads launch profile basics for card stats", () => {
    const page = readLocations();
    expect(page).toContain("loadRestaurantCardStats");
    expect(page).toContain("namesById");
    expect(page).toMatch(
      /restaurant_id,\s*phone,\s*timezone,\s*address_line1,\s*allows_pickup,\s*allows_delivery/
    );
  });

  it("location cards show operational labels and next action", () => {
    const page = readLocations();
    expect(page).toContain("On calls now");
    expect(page).toContain("Needs attention");
    expect(page).toContain("Follow-ups");
    expect(page).toContain("Reservations");
    expect(page).toContain("Orders (24h)");
    expect(page).toContain("nextBestAction");
  });

  it("restaurant card links into the restaurant workspace", () => {
    const page = readLocations();
    expect(page).toContain("restaurantLiveOrdersHref");
    expect(page).toContain("restaurantMenuSetupHref");
    expect(page).toContain("restaurantVoiceAgentHref");
  });

  it("workspace nav is scoped to the selected restaurant", () => {
    const nav = buildRestaurantWorkspaceNav({
      restaurantId: RESTAURANT_ID,
      hasLiveAgentRoute: true,
      hasRestaurantAnalytics: true,
      hasRestaurantBilling: true,
    });

    expect(nav.map((item) => item.id)).toEqual([
      "calls",
      "orders",
      "menu",
      "liveAgent",
      "analytics",
      "billing",
      "settings",
    ]);
    expect(nav.every((item) => item.href.includes(RESTAURANT_ID))).toBe(true);
    expect(nav.some((item) => item.href.includes(FOREIGN_ID))).toBe(false);
    expect(nav.find((item) => item.id === "settings")?.href).toContain(
      "#restaurant-settings"
    );
  });

  it("workspace routes enforce getRestaurantAccessForPage", () => {
    for (const route of [
      "app/dashboard/restaurants/[id]/page.tsx",
      "app/dashboard/restaurants/[id]/menu/page.tsx",
      "app/dashboard/restaurants/[id]/agent/page.tsx",
      "app/dashboard/restaurants/[id]/analytics/page.tsx",
      "app/dashboard/restaurants/[id]/billing/page.tsx",
    ]) {
      const src = read(route);
      expect(src).toContain("getRestaurantAccessForPage");
      expect(src).toContain("RestaurantWorkspaceRail");
      expect(src).toContain("restaurantId={restaurant.id}");
    }
  });

  it("live agent page uses compact real-data sections", () => {
    const page = read("app/dashboard/restaurants/[id]/agent/page.tsx");

    expect(page).toContain("RestaurantLaunchGateCard");
    expect(page).toContain("loadRestaurantLaunchGate");
    expect(page).toContain("compact");
    expect(page).toContain("voiceAgentCenter");
    expect(page).toContain('variant="inline"');
    expect(page).toContain("<MetaList");
    expect(page).not.toContain("RestaurantLaunchChecklist");
    expect(page).not.toContain("RestaurantCommandCenterPanel");
    expect(page).not.toMatch(/demo|fake data|MOCK_/i);
  });

  it("live orders and menu pages stay focused on their surfaces", () => {
    const kds = read("app/dashboard/restaurants/[id]/page.tsx");
    const menu = read("app/dashboard/restaurants/[id]/menu/page.tsx");
    const menuWorkspace = read(
      "app/dashboard/restaurants/[id]/menu/MenuSetupWorkspace.tsx"
    );

    expect(kds).toContain("loadLiveOrdersPageData");
    expect(kds).toContain("LiveOrdersPanel");
    expect(kds).toContain("PhoneAgentReadinessStrip");
    expect(kds).toContain("launchGate={pageData.launchGate}");
    expect(menu).toContain("loadRestaurantMenuSetupPageData");
    expect(menuWorkspace).toContain("MenuScanner");
    expect(menuWorkspace).toContain('id="restaurant-settings"');
    expect(menuWorkspace).not.toMatch(/staff roster|shift schedule/i);
  });

  it("workspace rail is a passthrough; the app sidebar owns location navigation", () => {
    const rail = read("app/dashboard/restaurants/[id]/RestaurantWorkspaceRail.tsx");
    const shell = read("components/dashboard/app-shell.tsx");
    expect(rail).toContain("export function RestaurantWorkspaceRail");
    expect(rail).toContain("suggestionCount?: number");
    expect(rail).toContain("<>{children}</>");
    expect(rail).not.toContain("workspace-rail-bottom");
    expect(shell).toContain("buildLocationNav(current.id, { pendingQuestions: current.pendingQuestions })");
  });
});
