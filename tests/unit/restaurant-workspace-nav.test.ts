import { describe, expect, it } from "vitest";
import {
  buildRestaurantWorkspaceNav,
  isRestaurantWorkspaceNavActive,
} from "@/lib/restaurant-workspace-nav";

describe("restaurant workspace nav", () => {
  it("includes call history route", () => {
    const nav = buildRestaurantWorkspaceNav({
      restaurantId: "r1",
      hasLiveAgentRoute: true,
    });
    const calls = nav.find((d) => d.id === "callHistory");
    expect(calls?.href).toBe("/dashboard/restaurants/r1/calls");
    expect(calls?.label).toBe("Call history");
  });

  it("marks call history path active", () => {
    expect(
      isRestaurantWorkspaceNavActive(
        "callHistory",
        "/dashboard/restaurants/r1/calls",
        "r1"
      )
    ).toBe(true);
  });
});
