import { describe, expect, it } from "vitest";
import {
  RESTAURANT_LIVE_ORDERS_LABEL,
  RESTAURANT_MENU_AGENT_LABEL,
  RESTAURANT_MENU_SETUP_TITLE,
  isRestaurantKdsPath,
  isRestaurantMenuAgentPath,
  restaurantWorkspaceMobileTitle,
} from "@/lib/dashboard-restaurant-labels";

describe("dashboard restaurant labels", () => {
  it("uses Kitchen and Menu for workspace titles", () => {
    expect(
      restaurantWorkspaceMobileTitle("/dashboard/restaurants/abc-123")
    ).toBe(RESTAURANT_LIVE_ORDERS_LABEL);
    expect(
      restaurantWorkspaceMobileTitle("/dashboard/restaurants/abc-123/menu")
    ).toBe(RESTAURANT_MENU_SETUP_TITLE);
    expect(restaurantWorkspaceMobileTitle("/dashboard/restaurants")).toBeNull();
  });

  it("exports owner-facing labels used in nav and CTAs", () => {
    expect(RESTAURANT_LIVE_ORDERS_LABEL).toBe("Kitchen");
    expect(RESTAURANT_MENU_AGENT_LABEL).toBe("Menu");
    expect(RESTAURANT_MENU_SETUP_TITLE).toBe("Menu");
  });

  it("classifies detail vs menu paths", () => {
    expect(isRestaurantKdsPath("/dashboard/restaurants/uuid")).toBe(true);
    expect(isRestaurantMenuAgentPath("/dashboard/restaurants/uuid/menu")).toBe(
      true
    );
    expect(isRestaurantKdsPath("/dashboard/restaurants/uuid/menu")).toBe(false);
  });
});
