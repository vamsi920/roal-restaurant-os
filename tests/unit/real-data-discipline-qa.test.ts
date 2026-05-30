import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");

const AUTH_WORKSPACE_FILES = [
  "app/dashboard/restaurants/page.tsx",
  "app/dashboard/restaurants/[id]/page.tsx",
  "app/dashboard/restaurants/[id]/LiveOrdersPanel.tsx",
  "app/dashboard/restaurants/[id]/CallStatusStrip.tsx",
  "app/dashboard/restaurants/[id]/LiveMenuSidebar.tsx",
  "app/dashboard/restaurants/[id]/menu/MenuSetupCallIndicator.tsx",
  "app/dashboard/restaurants/[id]/agent/page.tsx",
  "components/dashboard/app-shell.tsx",
] as const;

describe("real-data discipline (prompt 37)", () => {
  it("authenticated workspace routes load persisted tables, not demo rows", () => {
    const kdsPage = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/page.tsx"),
      "utf8"
    );
    const kdsLoader = readFileSync(
      join(REPO, "lib/live-orders/load-live-orders-page.ts"),
      "utf8"
    );
    const panel = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/LiveOrdersPanel.tsx"),
      "utf8"
    );
    const restaurants = readFileSync(
      join(REPO, "app/dashboard/restaurants/page.tsx"),
      "utf8"
    );

    expect(kdsPage).toContain("loadLiveOrdersPageData");
    expect(kdsLoader).toContain('from("draft_orders")');
    expect(kdsLoader).toContain('from("phone_order_receipts")');
    expect(panel).toContain("initialDraftOrders");
    expect(panel).toContain("postgres_changes");
    expect(panel).not.toMatch(/example order|fake.*order|seed.*order|MOCK_/i);
    expect(restaurants).toContain('from("restaurants")');
    expect(restaurants).not.toMatch(/const\s+restaurants\s*=\s*\[/);
  });

  it("call and menu indicators derive live state from draft_orders", () => {
    const strip = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/CallStatusStrip.tsx"),
      "utf8"
    );
    const indicator = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/menu/MenuSetupCallIndicator.tsx"),
      "utf8"
    );
    const menu = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/LiveMenuSidebar.tsx"),
      "utf8"
    );

    expect(strip).toContain("liveCount > 0");
    expect(strip).not.toMatch(/liveCount\s*=\s*[1-9]/);
    expect(indicator).toContain('from("draft_orders")');
    expect(indicator).toContain("isVoiceCartStatus");
    expect(indicator).not.toMatch(/setInterval|fake|demo|example/i);
    expect(menu).toContain('setMenuRealtime("live")');
    expect(menu).toContain('"connecting"');
    expect(menu).not.toMatch(/setMenuRealtime\("live"\)[\s\S]*useState\("live"\)/);
  });

  it("live agent uses control-center snapshot, not fabricated status", () => {
    const agent = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/agent/page.tsx"),
      "utf8"
    );
    const center = readFileSync(
      join(REPO, "lib/voice-agent/control-center.ts"),
      "utf8"
    );

    expect(agent).toContain("loadRestaurantMenuSetupPageData");
    expect(agent).toMatch(/center\.connectionStatus|voiceAgentCenter\.connectionStatus/);
    expect(center).toContain('connectionStatus = "disconnected"');
    expect(agent).not.toMatch(/MOCK_|demoAgent|fakeCenter|connectionStatus:\s*"connected"/);
  });

  it("app shell does not show org-level fake live badge", () => {
    const shell = readFileSync(join(REPO, "components/dashboard/app-shell.tsx"), "utf8");
    expect(shell).not.toContain("showLiveBadge");
    expect(shell).not.toContain("app-shell-header-badge");
    expect(shell).not.toContain("pulse-dot");
  });

  it("public marketing demos stay out of dashboard imports", () => {
    for (const file of AUTH_WORKSPACE_FILES) {
      const src = readFileSync(join(REPO, file), "utf8");
      expect(src).not.toContain("kds-motion-demo");
      expect(src).not.toContain("agent-conversation-demo");
      expect(src).not.toContain("social-proof-demo");
    }
  });
});
