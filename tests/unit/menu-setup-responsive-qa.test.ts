import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");
const read = (rel: string) => readFileSync(join(REPO, rel), "utf8");

describe("menu setup responsive (prompt 27)", () => {
  it("structures board, import tools and settings sections", () => {
    const workspace = read("app/dashboard/restaurants/[id]/menu/MenuSetupWorkspace.tsx");

    expect(workspace).toContain('id="menu-scan"');
    expect(workspace).toContain('id="menu-live"');
    expect(workspace).toContain('id="restaurant-settings"');
    expect(workspace).toContain("Upload menu photo");
    expect(workspace).toContain("<MenuSetupCallIndicator");
    expect(workspace).toContain("<MenuImportHistory");
    expect(workspace).toContain("<MenuCopyFromLocation");
    // Collapsed import tools open from the header action / URL hash.
    expect(workspace).toContain("<MenuHashOpener");
    expect(workspace).toContain('<MenuJumpLink target="menu-scan"');
  });

  it("keeps the menu board phone-safe without horizontal page scroll", () => {
    const editor = read("app/dashboard/restaurants/[id]/menu/MenuEditor.tsx");
    const workspace = read("app/dashboard/restaurants/[id]/menu/MenuSetupWorkspace.tsx");

    expect(workspace).toContain("min-w-0");
    // Category chips scroll inside their own container on phones.
    expect(editor).toContain("overflow-x-auto");
    expect(editor).toContain("lg:flex-col");
    // Item rows stack on phones and become a grid from sm up.
    expect(editor).toContain("sm:grid sm:grid-cols-");
    expect(editor).toContain("basis-full");
  });

  it("styles upsell editor for phone and tablet layouts", () => {
    const editor = read(
      "components/restaurant-upsell/RestaurantUpsellEditor.tsx"
    );
    expect(editor).toContain("sm:grid-cols-2");
    expect(editor).toContain("min-h-11");
    expect(editor).toContain("flex-wrap");
  });

  it("keeps realtime call indicator on real draft_orders data", () => {
    const indicator = read(
      "app/dashboard/restaurants/[id]/menu/MenuSetupCallIndicator.tsx"
    );
    expect(indicator).toContain("liveEndpoints.callStatus");
    expect(read("lib/live/load-live-orders.ts")).toContain('from("draft_orders")');
    expect(indicator).toContain('role="status"');
    expect(indicator).not.toMatch(/demo|fake|placeholder/i);
  });
});
