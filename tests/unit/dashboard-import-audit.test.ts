import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");

describe("dashboard import audit (prompt 30)", () => {
  it("KDS page loads menu via shared helper, not setup components", () => {
    const kds = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/page.tsx"),
      "utf8"
    );
    expect(kds).toContain("loadRestaurantMenu");
    expect(kds).not.toContain("DbCategory");
    expect(kds).not.toMatch(/from\("categories"\)/);
    expect(kds).not.toContain("MenuScanner");
    expect(kds).not.toContain("VoiceAgentPanel");
  });

  it("menu setup page delegates to workspace loader", () => {
    const menu = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/menu/page.tsx"),
      "utf8"
    );
    expect(menu).toContain("loadRestaurantMenuSetupPageData");
    expect(menu).toContain("MenuSetupWorkspace");
    expect(menu).not.toContain("LiveOrdersPanel");
  });

  it("nav uses owner-facing location copy not admin ops terms", () => {
    const nav = readFileSync(join(REPO, "lib/dashboard-nav.ts"), "utf8");
    expect(nav).toContain("RESTAURANT_LIST_NAV_LABEL");
    expect(nav).not.toContain("/dashboard/analytics");
    expect(nav).not.toContain("/dashboard/billing");
    expect(nav).not.toContain("Admin / Ops");
    expect(nav).not.toContain('badge: "Staff"');
    expect(nav).not.toMatch(/KDS orders/);
  });
});
