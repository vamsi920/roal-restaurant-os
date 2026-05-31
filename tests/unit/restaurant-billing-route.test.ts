import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");
const BILLING_PAGE = join(
  REPO,
  "app/dashboard/restaurants/[id]/billing/page.tsx"
);
const LOAD = join(REPO, "lib/billing/load-billing.ts");
const NAV = join(REPO, "lib/restaurant-workspace-nav.ts");
const DASH = join(REPO, "components/billing/BillingDashboard.tsx");
const LIMITS = join(REPO, "lib/billing/limits.ts");

describe("restaurant billing (prompt 20)", () => {
  it("exposes restaurant-scoped billing route with tenant access", () => {
    const page = readFileSync(BILLING_PAGE, "utf8");
    expect(page).toContain("getRestaurantAccessForPage");
    expect(page).toContain("loadRestaurantBilling");
    expect(page).toContain("hasRestaurantBilling");
    expect(page).not.toMatch(/seed|demo|savings|fabricat/i);
  });

  it("scopes usage queries to one restaurant when requested", () => {
    const load = readFileSync(LOAD, "utf8");
    expect(load).toContain("loadRestaurantBilling");
    expect(load).toContain("restaurantId: input.restaurantId");
    expect(load).toContain("phone_order_receipts");
    expect(load).toContain("accessibleRestaurantIds");
  });

  it("links billing from workspace rail to restaurant route", () => {
    const nav = readFileSync(NAV, "utf8");
    expect(nav).toContain("hasRestaurantBilling");
    expect(nav).toContain("${base}/billing");
  });

  it("labels organization vs location scope in billing UI", () => {
    const dash = readFileSync(DASH, "utf8");
    expect(dash).toContain('snapshot.scope === "restaurant"');
    expect(dash).toContain("Organization plan");
    expect(dash).toContain("This location — usage this period");
    expect(dash).toContain("No billable phone orders");
    expect(dash).toContain("billablePhoneOrders");
    expect(dash).not.toMatch(/savings|recovered revenue|fabricat/i);
  });

  it("omits org-wide location meter on restaurant scope", () => {
    const limits = readFileSync(LIMITS, "utf8");
    expect(limits).toContain('scope === "organization"');
    expect(limits).toContain("active_locations");
  });
});
