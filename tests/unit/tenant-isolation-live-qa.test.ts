import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");

describe("tenant isolation posture (launch 25)", () => {
  it("analytics uses session org only", () => {
    const page = readFileSync(
      join(REPO, "app/dashboard/analytics/page.tsx"),
      "utf8"
    );
    expect(page).toContain("membership.organization_id");
    expect(page).not.toMatch(/searchParams\.organization|organization_id.*query/i);
  });

  it("billing uses session org only", () => {
    const page = readFileSync(
      join(REPO, "app/dashboard/billing/page.tsx"),
      "utf8"
    );
    expect(page).toContain("membership.organization_id");
    expect(page).not.toMatch(/searchParams\.organization/i);
  });

  it("admin ops scoped to admin memberships", () => {
    const page = readFileSync(
      join(REPO, "app/dashboard/admin/page.tsx"),
      "utf8"
    );
    expect(page).toContain("hasOrgAdminAccess");
    expect(page).toContain("isOrgAdmin");
  });

  it("loadOrganizationAnalytics scopes by organizationId input", () => {
    const load = readFileSync(
      join(REPO, "lib/analytics/load-analytics.ts"),
      "utf8"
    );
    expect(load).toContain('.eq("organization_id", input.organizationId)');
    expect(load).toContain(".in(\"restaurant_id\", restaurantIds)");
  });

  it("notification APIs resolve org membership", () => {
    const events = readFileSync(
      join(REPO, "app/api/notifications/events/route.ts"),
      "utf8"
    );
    expect(events).toContain("resolveOrganizationId");
    expect(events).toContain("restaurant.organization_id !== resolved.organizationId");
    const stuck = readFileSync(
      join(REPO, "app/api/notifications/check-stuck/route.ts"),
      "utf8"
    );
    expect(stuck).toContain("resolveOrganizationId");
  });

  it("billing gates API checks org membership", () => {
    const gates = readFileSync(
      join(REPO, "app/api/billing/gates/route.ts"),
      "utf8"
    );
    expect(gates).toMatch(/resolveOrganizationId|membership/i);
  });

  it("SQL RLS probe script covers core surfaces", () => {
    const sql = readFileSync(
      join(REPO, "scripts/sql/tenant-isolation-probe.sql"),
      "utf8"
    );
    for (const table of [
      "restaurants",
      "organizations",
      "categories",
      "items",
      "draft_orders",
      "phone_order_receipts",
      "menu_imports",
      "notification_settings",
      "notification_deliveries",
      "usage_events",
    ]) {
      expect(sql).toContain(table);
    }
  });
});
