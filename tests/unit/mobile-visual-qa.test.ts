import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");

describe("mobile visual QA hooks (prompt 39)", () => {
  it("workspace bottom rail uses short mobile labels", () => {
    const nav = readFileSync(join(REPO, "lib/restaurant-workspace-nav.ts"), "utf8");
    const rail = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/RestaurantWorkspaceRail.tsx"),
      "utf8"
    );
    expect(nav).toContain("restaurantWorkspaceMobileNavLabel");
    expect(nav).toContain('return "Agent"');
    expect(rail).toContain("restaurantWorkspaceMobileNavLabel(item.id)");
  });

  it("menu nav label is Menu not combined agent wording", () => {
    const labels = readFileSync(
      join(REPO, "lib/dashboard-restaurant-labels.ts"),
      "utf8"
    );
    expect(labels).toContain('RESTAURANT_MENU_AGENT_LABEL = "Menu"');
    expect(labels).toContain('RESTAURANT_MENU_SETUP_TITLE = "Menu setup"');
  });

  it("KDS mobile CSS enforces touch targets and order tabs", () => {
    const css = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/kds-workspace.css"),
      "utf8"
    );
    expect(css).toMatch(/@media \(max-width: 639px\)/);
    expect(css).toContain("min-height: 2.75rem");
    expect(css).toContain(".kds-order-tab");
    expect(css).toContain("touch-action: manipulation");
  });

  it("auth forgot-password control meets touch height on phones", () => {
    const auth = readFileSync(join(REPO, "app/auth-page.css"), "utf8");
    expect(auth).toMatch(
      /@media \(max-width: 479px\)[\s\S]*\.public-auth-forgot-row button[\s\S]*min-height: 2\.75rem/
    );
  });

  it("landing hero mobile rules keep full-width CTAs", () => {
    const css = readFileSync(join(REPO, "app/landing-home.css"), "utf8");
    expect(css).toMatch(
      /@media \(max-width: 767px\)[\s\S]*\.home-hero__ctas \.public-btn-primary[\s\S]*min-height:\s*2\.75rem/m
    );
    expect(css).toMatch(/@media \(max-width: 479px\)[\s\S]*\.home-hero__surface[\s\S]*max-width:\s*100%/m);
  });
});
