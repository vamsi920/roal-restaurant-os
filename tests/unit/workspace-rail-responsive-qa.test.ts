import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  isRestaurantWorkspaceNavActive,
  restaurantWorkspaceMobileNavLabel,
} from "@/lib/restaurant-workspace-nav";

const REPO = join(import.meta.dirname, "../..");
const read = (rel: string) => readFileSync(join(REPO, rel), "utf8");

describe("workspace rail responsive (prompt 21)", () => {
  it("uses compact desktop rail and app-like mobile bottom nav", () => {
    const rail = read("app/dashboard/restaurants/[id]/RestaurantWorkspaceRail.tsx");
    expect(rail).toContain("workspace-rail-desktop");
    expect(rail).toContain("w-40");
    expect(rail).toContain("workspace-rail-bottom");
    expect(rail).toContain("workspace-rail-bottom__list");
    expect(rail).toContain("gridTemplateColumns");
    expect(rail).toContain('case "callHistory"');
    expect(rail).toContain("overflow-x-clip");
    expect(rail).toContain("kds-workspace__main");
  });

  it("exposes back link, long name titles, and aria-current via shared helper", () => {
    const rail = read("app/dashboard/restaurants/[id]/RestaurantWorkspaceRail.tsx");
    expect(rail).toContain("isRestaurantWorkspaceNavActive");
    expect(rail).toContain('title={restaurantName}');
    expect(rail).toContain('aria-label={item.label}');
    expect(rail).toContain('href="/dashboard/restaurants"');
  });

  it("styles bottom rail active state and safe-area padding", () => {
    const css = read("app/dashboard/restaurants/[id]/kds-workspace.css");
    expect(css).toContain("Workspace rail (prompt 21)");
    expect(css).toContain(".workspace-rail-bottom__link--active");
    expect(css).toContain("safe-area-inset-bottom");
    expect(css).toContain(".workspace-rail-desktop__link--active");
  });

  it("resolves active routes for orders and menu", () => {
    const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const base = `/dashboard/restaurants/${id}`;
    expect(isRestaurantWorkspaceNavActive("orders", base, id)).toBe(true);
    expect(isRestaurantWorkspaceNavActive("menu", `${base}/menu`, id)).toBe(true);
    expect(isRestaurantWorkspaceNavActive("orders", `${base}/menu`, id)).toBe(false);
    expect(restaurantWorkspaceMobileNavLabel("analytics")).toBe("Stats");
  });
});
