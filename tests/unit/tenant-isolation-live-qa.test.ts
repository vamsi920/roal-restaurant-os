import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");

describe("tenant isolation posture (launch 25 / pass 30)", () => {
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
    expect(page).not.toMatch(/searchParams\.restaurant/);
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
      "agent_call_events",
      "restaurant_profiles",
      "restaurant_onboarding",
      "restaurant_weekly_hours",
      "audit_logs",
    ]) {
      expect(sql).toContain(table);
    }
  });

  it("call-session loader scopes by restaurant_id", () => {
    const load = readFileSync(
      join(REPO, "lib/agent-calls/load-call-sessions.ts"),
      "utf8"
    );
    expect(load).toContain('.eq("restaurant_id", restaurantId)');
    expect(load).toContain("agent_call_events");
    expect(load).toContain("restaurant_profiles");
  });

  it("org overview and launch loaders scope by org restaurants", () => {
    const overview = readFileSync(
      join(REPO, "lib/org-overview/load-org-overview.ts"),
      "utf8"
    );
    expect(overview).toContain('.eq("organization_id", input.organizationId)');
    expect(overview).toContain('.in("restaurant_id", restaurantIds)');
    expect(overview).toContain("elevenlabs_menu_auto_sync_status");

    const launch = readFileSync(
      join(REPO, "lib/restaurant-launch/load-checklist.ts"),
      "utf8"
    );
    expect(launch).toContain("getRestaurantProfile(supabase, input.restaurantId)");
    expect(launch).toContain('.eq("restaurant_id", restaurantId)');
  });

  it("dashboard restaurant pages gate with getRestaurantAccessForPage", () => {
    for (const page of [
      "app/dashboard/restaurants/[id]/agent/page.tsx",
      "app/dashboard/restaurants/[id]/analytics/page.tsx",
      "app/dashboard/restaurants/[id]/calls/page.tsx",
    ]) {
      const src = readFileSync(join(REPO, page), "utf8");
      expect(src).toContain("getRestaurantAccessForPage");
    }
  });

  it("voice and onboarding server actions require restaurant access", () => {
    const voice = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/voice-agent-actions.ts"),
      "utf8"
    );
    expect(voice).toContain("requireRestaurantAccess");

    const onboarding = readFileSync(
      join(REPO, "app/dashboard/onboarding/actions.ts"),
      "utf8"
    );
    expect(onboarding).toContain("does not belong to this organization");
    expect(onboarding).toContain("requireOrgMembership");
  });
});
