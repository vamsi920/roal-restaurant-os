import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  isRestaurantWorkspacePath,
  restaurantWorkspaceMobileTitle,
} from "@/lib/dashboard-restaurant-labels";

const REPO = join(import.meta.dirname, "../..");

describe("dashboard shell workspace flow (prompt 21)", () => {
  it("sidebar favors locations then workspace rail", () => {
    const nav = readFileSync(join(REPO, "lib/dashboard-nav.ts"), "utf8");
    const shell = readFileSync(join(REPO, "components/dashboard/app-shell.tsx"), "utf8");
    expect(nav).not.toContain('href: "/dashboard/analytics"');
    expect(nav).not.toContain('href: "/dashboard/billing"');
    expect(nav).not.toContain('href: "/dashboard"');
    expect(shell).toContain('href="/dashboard/restaurants"');
    expect(shell).toContain("restaurantWorkspaceMobileTitle");
  });

  it("layout shows platform nav only for platform staff", () => {
    const layout = readFileSync(join(REPO, "app/dashboard/layout.tsx"), "utf8");
    expect(layout).toContain("isPlatformAdminEmail(context.user.email)");
    expect(layout).not.toContain("hasOrgAdminAccess");
  });

  it("recognizes restaurant workspace routes for mobile titles", () => {
    const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    expect(isRestaurantWorkspacePath(`/dashboard/restaurants/${id}/agent`)).toBe(
      true
    );
    expect(
      restaurantWorkspaceMobileTitle(`/dashboard/restaurants/${id}/analytics`)
    ).toBe("Analytics");
  });
});
