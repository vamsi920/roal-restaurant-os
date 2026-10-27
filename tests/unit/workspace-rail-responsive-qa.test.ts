import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  isRestaurantWorkspaceNavActive,
  restaurantWorkspaceMobileNavLabel,
} from "@/lib/restaurant-workspace-nav";

const REPO = join(import.meta.dirname, "../..");
const read = (rel: string) => readFileSync(join(REPO, rel), "utf8");

describe("workspace navigation (v3 sidebar)", () => {
  it("rail renders only its children; pages keep their imports and props", () => {
    const rail = read("app/dashboard/restaurants/[id]/RestaurantWorkspaceRail.tsx");
    expect(rail).toContain("restaurantId: string");
    expect(rail).toContain("restaurantName: string");
    expect(rail).toContain("hasRestaurantAnalytics?: boolean");
    expect(rail).toContain("hasRestaurantBilling?: boolean");
    expect(rail).toContain("<>{children}</>");
  });

  it("mobile drawer replaces the bottom rail with tap-sized, labelled links", () => {
    const shell = read("components/dashboard/app-shell.tsx");
    expect(shell).toContain("min-h-11");
    expect(shell).toContain('aria-current={active ? "page" : undefined}');
    expect(shell).toContain("aria-label={compact ? item.label : undefined}");
    expect(shell).toContain("SIDEBAR_COLLAPSED_KEY");
  });

  it("resolves active routes for orders and menu (legacy helper)", () => {
    const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const base = `/dashboard/restaurants/${id}`;
    expect(isRestaurantWorkspaceNavActive("orders", base, id)).toBe(true);
    expect(isRestaurantWorkspaceNavActive("menu", `${base}/menu`, id)).toBe(true);
    expect(isRestaurantWorkspaceNavActive("orders", `${base}/menu`, id)).toBe(false);
    expect(restaurantWorkspaceMobileNavLabel("analytics")).toBe("Reports");
  });
});
