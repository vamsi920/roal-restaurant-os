import { describe, expect, it } from "vitest";
import {
  RESTAURANT_CALLS_FOLLOWUPS_LABEL,
  buildRestaurantWorkspaceNav,
  isRestaurantWorkspaceNavActive,
  restaurantWorkspaceMobileNavLabel,
} from "@/lib/restaurant-workspace-nav";

describe("restaurant workspace nav", () => {
  it("includes Calls / Follow-ups route scoped to the restaurant", () => {
    const nav = buildRestaurantWorkspaceNav({
      restaurantId: "r1",
      hasLiveAgentRoute: true,
    });
    const calls = nav.find((d) => d.id === "calls");
    expect(calls).toMatchObject({
      href: "/dashboard/restaurants/r1/calls",
      label: RESTAURANT_CALLS_FOLLOWUPS_LABEL,
    });
  });

  it("uses Calls as the mobile rail label", () => {
    expect(restaurantWorkspaceMobileNavLabel("calls")).toBe("Calls");
  });

  it("marks the calls path active for the calls destination", () => {
    expect(
      isRestaurantWorkspaceNavActive(
        "calls",
        "/dashboard/restaurants/r1/calls",
        "r1"
      )
    ).toBe(true);
    expect(
      isRestaurantWorkspaceNavActive(
        "orders",
        "/dashboard/restaurants/r1/calls",
        "r1"
      )
    ).toBe(false);
  });

  it("includes settings route scoped to the restaurant menu workspace", () => {
    const nav = buildRestaurantWorkspaceNav({
      restaurantId: "r1",
      hasLiveAgentRoute: true,
    });
    const settings = nav.find((d) => d.id === "settings");
    expect(settings?.href).toBe(
      "/dashboard/restaurants/r1/menu#restaurant-settings"
    );
    expect(settings?.label).toBe("Settings");
  });

  it("marks menu path active for settings destination check", () => {
    expect(
      isRestaurantWorkspaceNavActive(
        "menu",
        "/dashboard/restaurants/r1/menu",
        "r1"
      )
    ).toBe(true);
  });
});
