import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");
const KDS_PAGE = join(REPO, "app/dashboard/restaurants/[id]/page.tsx");

describe("KDS page rendering (prompt 31)", () => {
  const page = () => readFileSync(KDS_PAGE, "utf8");

  it("renders live orders panel only (no menu scanner UI)", () => {
    const src = page();
    expect(src).toContain("<LiveOrdersPanel");
    expect(src).toContain("restaurantId={restaurant.id}");
    expect(src).toContain("initialDraftOrders={initialDraftOrders}");
    expect(src).not.toContain("<MenuScanner");
    expect(src).not.toContain("Upload menu photo");
    expect(src).not.toContain("menu-scan");
    expect(src).not.toContain("<LiveMenuSidebar");
    expect(src).not.toContain("MenuImportHistory");
  });

  it("does not link to menu or agent setup from the KDS page", () => {
    const src = page();
    expect(src).not.toContain("RESTAURANT_MENU_AGENT_LABEL");
    expect(src).not.toMatch(/\/menu`/);
    expect(src).not.toContain("<VoiceAgentPanel");
    expect(src).not.toContain("RestaurantProfileSettings");
    expect(src).not.toContain("RestaurantHoursSettings");
  });

  it("redirects guests to login with return path", () => {
    const src = page();
    expect(src).toContain("getRestaurantAccessForPage");
    expect(src).toContain("getAuthContext");
    expect(src).toMatch(
      /redirect\(`\/login\?next=\/dashboard\/restaurants\/\$\{params\.id\}`\)/
    );
    expect(src).toContain("notFound()");
  });
});

describe("KDS workspace UX", () => {
  it("imports kds-workspace styles and renders orders-only KDS page", () => {
    const page = readFileSync(KDS_PAGE, "utf8");
    expect(page).toContain("kds-workspace.css");
    expect(page).toContain('className="kds-workspace');
    expect(page).toContain("<LiveOrdersPanel");
    expect(page).not.toContain("<LiveMenuSidebar");
    expect(page).not.toContain("<MenuScanner");
    expect(page).not.toContain("<VoiceAgentPanel");
    expect(page).not.toContain("RestaurantProfileSettings");
    expect(page).not.toContain("RestaurantHoursSettings");
  });

  it("exposes mobile landmarks for live orders page", () => {
    const panel = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/LiveOrdersPanel.tsx"),
      "utf8"
    );
    const rail = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/RestaurantWorkspaceRail.tsx"),
      "utf8"
    );
    expect(rail).toContain('aria-label="Location workspace"');
    expect(rail).toContain('aria-label="Restaurant workspace"');
    expect(panel).toContain('id="kds-page-heading"');
    expect(panel).toContain("kds-orders-head");
    expect(panel).toContain("kds-order-panel-heading");
    expect(panel).toContain('role="tablist"');
  });

  it("uses a compact orders-only KDS header", () => {
    const page = readFileSync(KDS_PAGE, "utf8");
    const panel = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/LiveOrdersPanel.tsx"),
      "utf8"
    );
    expect(page).not.toContain("<header");
    expect(panel).toContain("RESTAURANT_LIVE_ORDERS_LABEL");
    expect(panel).toContain("kds-orders-head");
    expect(panel).toContain("KdsRealtimeIndicator");
    expect(panel).not.toContain("RESTAURANT_MENU_AGENT_LABEL");
    expect(panel).not.toContain("pulse-dot");
    expect(panel).not.toContain("KdsStatusBanner");
    expect(page).not.toContain("Realtime synced");
    expect(page).not.toContain("RESTAURANT_KDS_LABEL");
  });

  it("collapses profile by default like hours", () => {
    const profile = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/RestaurantProfileSettings.tsx"),
      "utf8"
    );
    expect(profile).toContain("const [open, setOpen] = useState(false)");
  });

  it("uses owner-facing order tabs without realtime jargon", () => {
    const panel = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/LiveOrdersPanel.tsx"),
      "utf8"
    );
    expect(panel).toContain("KdsEmptyStatePanel");
    expect(panel).toContain('label="New"');
    expect(panel).toContain('label="In progress"');
    expect(panel).toContain('useState<Tab>("new")');
    expect(panel).not.toMatch(/>\s*Realtime\s*</);
    expect(panel).toContain("KdsRealtimeIndicator");
    expect(panel).toContain('state={realtimeUi}');
    expect(panel).not.toContain("KdsStatusBanner");
    expect(panel).not.toContain("polling every");
    expect(panel).not.toContain("Kitchen queue");
    expect(panel).not.toContain("Live carts");
    expect(panel).toContain("CallStatusStrip");
    expect(panel).toContain("kds-panel-sticky-head");
    expect(panel).toContain("kds-orders-canvas");
    expect(panel).not.toContain("glass-card");
  });

  it("defines mobile-first KDS layout in CSS", () => {
    const css = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/kds-workspace.css"),
      "utf8"
    );
    expect(css).toContain("kds-orders-head");
    expect(css).toContain("kds-sync-indicator");
    expect(css).toContain("kds-thumb-btn");
    expect(css).toContain("overflow-x: auto");
    expect(css).toContain("kds-order-list");
    expect(css).toContain("kds-orders-canvas");
    expect(css).toContain("kds-order-card[data-order-status");
    expect(css).toContain("kds-done-history");
    expect(css).toContain(".kds-workspace.menu-setup .kds-live-menu");
    expect(css).toContain("menu-setup-flow");
    expect(css).toContain("menu-setup-step__card");
    expect(css).toContain(".kds-workspace:not(.menu-setup)");
    expect(css).not.toMatch(/\.kds-workspace \.kds-live-menu[^\-]/);
  });

  it("polishes KDS loading, error, and disconnected states (prompt 18)", () => {
    const panel = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/LiveOrdersPanel.tsx"),
      "utf8"
    );
    const states = readFileSync(
      join(REPO, "components/dashboard/kds-workspace-states.tsx"),
      "utf8"
    );
    expect(panel).toContain("KdsLoadingPanel");
    expect(panel).toContain('rows={0}');
    expect(panel).toContain("ordersReady");
    expect(panel).toContain("KdsDisconnectedNotice");
    expect(panel).toContain("KdsSyncErrorNotice");
    expect(panel).toContain("KdsRecoveryButton");
    expect(panel).toContain("Couldn't load orders");
    expect(panel).not.toContain("Try again");
    expect(panel).not.toContain("{syncError}");
    expect(states).toContain("kds-orders-disconnected");
    expect(states).toContain("kds-recovery-btn");
  });

  it("shows calm global empty state without menu or agent CTAs", () => {
    const panel = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/LiveOrdersPanel.tsx"),
      "utf8"
    );
    const states = readFileSync(
      join(REPO, "components/dashboard/kds-workspace-states.tsx"),
      "utf8"
    );
    expect(panel).toContain("No orders yet");
    expect(panel).toContain("KdsRecoveryButton");
    expect(states).toContain("kds-empty-state--title-only");
    expect(panel).toContain("KdsEmptyStatePanel");
    expect(panel).not.toContain("RESTAURANT_MENU_AGENT_LABEL");
    expect(panel).not.toMatch(/\/menu`/);
  });

  it("uses shared workspace loading and empty state components", () => {
    const states = readFileSync(
      join(REPO, "components/dashboard/kds-workspace-states.tsx"),
      "utf8"
    );
    const panel = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/LiveOrdersPanel.tsx"),
      "utf8"
    );
    const menu = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/LiveMenuSidebar.tsx"),
      "utf8"
    );
    const imports = readFileSync(
      join(REPO, "components/menu-import/MenuImportHistory.tsx"),
      "utf8"
    );
    const css = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/kds-workspace.css"),
      "utf8"
    );
    expect(states).toContain("kds-empty-state");
    expect(states).toContain("KdsRealtimeIndicator");
    expect(states).toContain("kds-sync-indicator");
    expect(states).toContain("kds-loading-panel");
    expect(panel).toContain("kds-workspace-states");
    expect(menu).toContain("KdsEmptyStatePanel");
    expect(imports).toContain("KdsLoadingPanel");
    expect(imports).toContain("No menu imports yet");
    expect(css).toContain("kds-workspace-state__banner");
  });

  it("hides session IDs on order cards (modal only)", () => {
    const card = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/KitchenOrderCard.tsx"),
      "utf8"
    );
    const parts = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/order-card-parts.tsx"),
      "utf8"
    );
    expect(card).toContain("OrderActionButton");
    expect(card).toContain("OrderDetailsLink");
    expect(card).not.toContain("session_id");
    expect(parts).not.toContain("font-mono-tabular text-[11px]");
  });

  it("order detail modal is owner-facing", () => {
    const modal = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/OrderDetailModal.tsx"),
      "utf8"
    );
    expect(modal).toContain("Order summary");
    expect(modal).toContain("Call reference");
    expect(modal).not.toContain("Status history");
    expect(modal).not.toContain("price unknown");
    expect(modal).not.toContain('>Session<');
  });

  it("collapses voice test harness by default", () => {
    const harness = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/VoiceAgentTestHarness.tsx"),
      "utf8"
    );
    expect(harness).toContain('variant?: "panel" | "test-call"');
    expect(harness).toContain("menu-setup-test-call");
    expect(harness).toContain("const [open, setOpen] = useState(false)");
  });
});
