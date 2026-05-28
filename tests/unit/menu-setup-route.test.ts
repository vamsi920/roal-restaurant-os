import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");
const KDS_PAGE = join(REPO, "app/dashboard/restaurants/[id]/page.tsx");
const MENU_PAGE = join(REPO, "app/dashboard/restaurants/[id]/menu/page.tsx");
const AGENT_PAGE = join(REPO, "app/dashboard/restaurants/[id]/agent/page.tsx");
const WORKSPACE = join(
  REPO,
  "app/dashboard/restaurants/[id]/menu/MenuSetupWorkspace.tsx"
);
const CALL_INDICATOR = join(
  REPO,
  "app/dashboard/restaurants/[id]/menu/MenuSetupCallIndicator.tsx"
);

describe("menu setup rendering (workspace)", () => {
  const workspace = () => readFileSync(WORKSPACE, "utf8");
  const menuPage = () => readFileSync(MENU_PAGE, "utf8");

  it("renders menu photo scanner section", () => {
    const src = workspace();
    expect(src).toContain("<MenuScanner");
    expect(src).toContain('id="menu-scan"');
    expect(src).toContain("Upload menu photo");
    expect(src).toContain("menuScanGate={billingGates?.menu_scan");
    expect(src).toContain("hidePanelHeader");
  });

  it("renders live menu panel with realtime call indicator", () => {
    const src = workspace();
    expect(src).toContain("<LiveMenuSidebar");
    expect(src).toContain("<MenuSetupCallIndicator");
    expect(src).toContain('id="menu-setup-live-heading"');
    expect(src).toContain("Live menu");
    expect(src).toContain("initialCategories={menu.categories}");
    expect(src).not.toContain("<VoiceAgentPanel");
  });

  it("links to live agent and orders instead of embedding agent UI", () => {
    const src = workspace();
    expect(src).toContain("RESTAURANT_LIVE_ORDERS_LABEL");
    expect(src).toMatch(/href=\{`\/dashboard\/restaurants\/\$\{restaurant\.id\}\/agent`\}/);
    expect(src).not.toContain("<LiveOrdersPanel");
    expect(src).not.toContain("<VoiceAgentTestHarness");
  });

  it("call indicator uses draft_orders realtime subscription", () => {
    const indicator = readFileSync(CALL_INDICATOR, "utf8");
    expect(indicator).toContain('from("draft_orders")');
    expect(indicator).toContain("postgres_changes");
    expect(indicator).toContain("isVoiceCartStatus");
    expect(indicator).toContain("Call in progress");
    expect(indicator).not.toMatch(/setInterval|fake|demo|example/i);
  });

  it("redirects guests to login with menu return path", () => {
    const src = menuPage();
    expect(src).toContain("getRestaurantAccessForPage");
    expect(src).toMatch(
      /redirect\(`\/login\?next=\/dashboard\/restaurants\/\$\{params\.id\}\/menu`\)/
    );
    expect(src).toContain("<MenuSetupWorkspace");
    expect(src).toContain("RestaurantWorkspaceRail");
  });
});

describe("menu setup route split", () => {
  it("keeps scanner and live menu off KDS", () => {
    const kds = readFileSync(KDS_PAGE, "utf8");
    expect(kds).toContain("<LiveOrdersPanel");
    expect(kds).not.toContain("MenuScanner");
    expect(kds).not.toContain("LiveMenuSidebar");
    expect(kds).not.toContain("MenuImportHistory");
  });

  it("hosts voice agent on dedicated agent route", () => {
    const agent = readFileSync(AGENT_PAGE, "utf8");
    expect(agent).toContain("<VoiceAgentPanel");
    expect(agent).toContain("loadRestaurantMenuSetupPageData");
    expect(agent).toContain("voiceAgentCenter");
    expect(agent).not.toContain("menu-setup-flow");
  });

  it("loader fetches menu, gates, profile, hours, and voice center", () => {
    const loader = readFileSync(
      join(REPO, "lib/restaurant-menu-setup/load-page-data.ts"),
      "utf8"
    );
    expect(loader).toContain("loadRestaurantMenu");
    expect(loader).toContain("loadOrganizationGateVerdicts");
    expect(loader).toContain("ensureRestaurantProfile");
    expect(loader).toContain("loadRestaurantHoursBundle");
    expect(loader).toContain("loadVoiceAgentControlCenter");
  });
});
