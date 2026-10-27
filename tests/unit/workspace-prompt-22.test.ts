import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");

const WORKSPACE_ROUTES = [
  "app/dashboard/restaurants/[id]/page.tsx",
  "app/dashboard/restaurants/[id]/menu/page.tsx",
  "app/dashboard/restaurants/[id]/agent/page.tsx",
  "app/dashboard/restaurants/[id]/analytics/page.tsx",
  "app/dashboard/restaurants/[id]/billing/page.tsx",
] as const;

describe("workspace prompt 22 targeted checks", () => {
  it("restaurant workspace routes use getRestaurantAccessForPage", () => {
    for (const route of WORKSPACE_ROUTES) {
      const src = readFileSync(join(REPO, route), "utf8");
      expect(src).toContain("getRestaurantAccessForPage");
      expect(src).toContain("RestaurantWorkspaceRail");
    }
  });

  it("KDS panel subscribes to draft_orders for realtime", () => {
    const panel = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/LiveOrdersPanel.tsx"),
      "utf8"
    );
    expect(panel).toContain("usePoll");
    expect(panel).toContain("draftOrders");
    expect(panel).toContain("realtimeUi = live.state");
    expect(panel).toContain("RealtimeBadge");
    expect(panel).not.toMatch(/example order|fake.*order|seed.*order/i);
  });

  it("menu call indicator and agent page use real loaders", () => {
    const indicator = readFileSync(
      join(
        REPO,
        "app/dashboard/restaurants/[id]/menu/MenuSetupCallIndicator.tsx"
      ),
      "utf8"
    );
    const agent = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/agent/page.tsx"),
      "utf8"
    );
    expect(indicator).toContain("drafts");
    expect(indicator).toContain("liveEndpoints.callStatus");
    expect(agent).toContain("voiceAgentCenter");
    expect(agent).toContain("loadRestaurantMenuSetupPageData");
    expect(agent).not.toMatch(/MOCK_|demoAgent|fakeCenter/i);
  });

  it("workspace nav builder points analytics and billing to restaurant paths", () => {
    const nav = readFileSync(join(REPO, "lib/restaurant-workspace-nav.ts"), "utf8");
    expect(nav).toContain("${base}/analytics");
    expect(nav).toContain("${base}/billing");
    expect(nav).toContain("hasRestaurantAnalytics");
    expect(nav).toContain("hasRestaurantBilling");
  });
});
