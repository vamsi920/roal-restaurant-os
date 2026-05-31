import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildRestaurantWorkspaceNav } from "@/lib/restaurant-workspace-nav";

const REPO = join(import.meta.dirname, "../..");
const read = (rel: string) => readFileSync(join(REPO, rel), "utf8");

const RESTAURANT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const FOREIGN_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("dashboard restaurant workspace (pass 65)", () => {
  it("home redirects to the accessible locations list", () => {
    const home = read("app/dashboard/page.tsx");
    expect(home).toContain('redirect("/dashboard/restaurants")');
    expect(home).not.toContain("/dashboard/overview");
  });

  it("locations page loads restaurants from the database only", () => {
    const page = read("app/dashboard/restaurants/page.tsx");
    expect(page).toContain('from("restaurants")');
    expect(page).toContain("loadRestaurantCardStats");
    expect(page).toContain("buildPortfolioSummary");
    expect(page).toContain("PortfolioSummaryStrip");
    expect(page).toContain("Organization portfolio");
    expect(page).not.toMatch(/const\s+restaurants\s*=\s*\[/);
    expect(page).not.toMatch(/demo|fake|seed|MOCK_/i);
  });

  it("locations page loads launch profile basics for card stats", () => {
    const page = read("app/dashboard/restaurants/page.tsx");
    expect(page).toContain("loadRestaurantCardStats");
    expect(page).toContain("namesById");
    expect(page).toMatch(
      /restaurant_id,\s*phone,\s*timezone,\s*address_line1,\s*allows_pickup,\s*allows_delivery/
    );
  });

  it("location cards show operational labels and next action", () => {
    const page = read("app/dashboard/restaurants/page.tsx");
    expect(page).toContain("Active calls");
    expect(page).toContain("Follow-ups");
    expect(page).toContain("Reservations");
    expect(page).toContain("Orders (24h)");
    expect(page).toContain("nextBestAction");
    expect(page).toContain("dedicated phone agent");
  });

  it("restaurant card links into the restaurant workspace", () => {
    const page = read("app/dashboard/restaurants/page.tsx");
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
      "orders",
      "menu",
      "liveAgent",
      "calls",
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
    const panel = read("components/command-center/RestaurantCommandCenterPanel.tsx");

    expect(page).toContain("RestaurantLaunchGateCard");
    expect(page).toContain("loadRestaurantLaunchGate");
    expect(page).toContain("RestaurantCommandCenterPanel");
    expect(page).toContain("compact");
    expect(page).toContain("voiceAgentCenter");
    expect(page).toContain('variant="inline"');
    expect(page).toContain("live-agent-page__inline-meta");
    expect(page).not.toContain("RestaurantLaunchChecklist");
    expect(page).not.toContain("live-agent-page__stats");
    expect(panel).toContain("command-center--compact");
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

  it("mobile workspace rail keeps bottom navigation usable", () => {
    const rail = read("app/dashboard/restaurants/[id]/RestaurantWorkspaceRail.tsx");
    expect(rail).toContain("workspace-rail-bottom");
    expect(rail).toContain("gridTemplateColumns");
    expect(rail).toContain("restaurantWorkspaceMobileNavLabel");
    expect(rail).toContain("min-h-[3.5rem]");
  });
});
