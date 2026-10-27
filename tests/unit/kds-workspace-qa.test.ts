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
    expect(src).toContain("initialDraftOrders={pageData.initialDraftOrders}");
    expect(src).not.toContain("<MenuScanner");
    expect(src).not.toContain("Upload menu photo");
    expect(src).not.toContain("menu-scan");
    expect(src).not.toContain("<LiveMenuSidebar");
    expect(src).not.toContain("MenuImportHistory");
  });

  it("links to menu builder without embedding menu management UI", () => {
    const src = page();
    expect(src).toContain("/menu");
    expect(src).not.toContain("<MenuScanner");
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

  it("exposes landmarks and a page header for the Kitchen board", () => {
    const panel = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/LiveOrdersPanel.tsx"),
      "utf8"
    );
    expect(panel).toContain("<PageHeader");
    expect(panel).toContain("kds-order-panel-heading");
    expect(panel).toContain('role="tablist"');
    expect(panel).toContain('role="tabpanel"');
  });

  it("uses a compact Kitchen header with a realtime badge", () => {
    const page = readFileSync(KDS_PAGE, "utf8");
    const panel = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/LiveOrdersPanel.tsx"),
      "utf8"
    );
    expect(panel).toContain("RESTAURANT_LIVE_ORDERS_LABEL");
    expect(panel).toContain("<RealtimeBadge state={realtimeUi} />");
    expect(panel).not.toContain("RESTAURANT_MENU_AGENT_LABEL");
    expect(panel).not.toContain("KdsStatusBanner");
    expect(page).not.toContain("Phone operations");
    expect(page).not.toContain("ws-page-head");
    expect(page).not.toContain("RESTAURANT_KDS_LABEL");
  });

  it("collapses profile by default like hours", () => {
    const profile = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/RestaurantProfileSettings.tsx"),
      "utf8"
    );
    // Settings are always-open panels so /menu#restaurant-settings lands on visible forms.
    expect(profile).not.toMatch(/const \[open, setOpen\] = useState/);
    expect(profile).toContain("SettingsPanel");
    expect(profile).toContain("SaveRow");
  });

  it("uses owner-facing lanes without realtime jargon", () => {
    const panel = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/LiveOrdersPanel.tsx"),
      "utf8"
    );
    expect(panel).toContain('title="New"');
    expect(panel).toContain('title="Preparing"');
    expect(panel).toContain('title="Ready"');
    expect(panel).toContain('useState<Tab>("board")');
    expect(panel).not.toMatch(/>\s*Realtime\s*</);
    expect(panel).not.toContain("polling every");
    expect(panel).not.toContain("Live carts");
    expect(panel).toContain("LiveCallIndicator");
    expect(panel).not.toContain("glass-card");
  });

  it("keeps the workspace CSS small and kitchen-specific", () => {
    const css = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/kds-workspace.css"),
      "utf8"
    );
    expect(css).toContain(".kds-board");
    expect(css).toContain(".kds-ticket");
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css).not.toContain("menu-setup");
    expect(css).not.toContain("ws-page-head");
    expect(css.split("\n").length).toBeLessThan(400);
  });

  it("polishes Kitchen loading, error, and disconnected states", () => {
    const panel = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/LiveOrdersPanel.tsx"),
      "utf8"
    );
    expect(panel).toContain("<LoadingRows");
    expect(panel).toContain("rows={3}");
    expect(panel).toContain("ordersReady");
    expect(panel).toContain("Live updates paused.");
    expect(panel).toContain("Couldn't refresh orders.");
    expect(panel).toContain("Couldn't load orders");
    expect(panel).not.toContain("Try again");
    expect(panel).not.toContain("kds-workspace-states");
  });

  it("shows an intentional empty board with one next step", () => {
    const panel = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/LiveOrdersPanel.tsx"),
      "utf8"
    );
    expect(panel).toContain("No phone orders yet");
    expect(panel).toContain("<EmptyState");
    expect(panel).toContain("Place a test order");
    expect(panel).toContain("emptyTitle=");
  });

  it("uses shared workspace loading and empty state components", () => {
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
    expect(panel).toContain("@/components/live-orders/workspace-ui");
    expect(menu).toContain("EmptyState");
    expect(menu).not.toContain("kds-workspace-states");
    expect(imports).toContain("LoadingRows");
    expect(imports).not.toContain("kds-workspace-states");
    expect(imports).toContain("No menu imports yet");
    expect(css).toContain(".kds-lane__empty");
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
