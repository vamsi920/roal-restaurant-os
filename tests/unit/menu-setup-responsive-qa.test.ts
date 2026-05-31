import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");
const read = (rel: string) => readFileSync(join(REPO, rel), "utf8");

describe("menu setup responsive (prompt 27)", () => {
  it("structures guided upload and live menu with progress", () => {
    const workspace = read("app/dashboard/restaurants/[id]/menu/MenuSetupWorkspace.tsx");

    expect(workspace).toContain("menu-setup-progress");
    expect(workspace).toContain("menu-setup-primary__grid");
    expect(workspace).toContain('id="menu-scan"');
    expect(workspace).toContain('id="menu-live"');
    expect(workspace).toContain("Step 1");
    expect(workspace).toContain("Step 2");
    expect(workspace).toContain("menu-setup-crumb hidden");
    expect(workspace).toContain("<MenuSetupCallIndicator");
    expect(workspace).toContain("<MenuImportHistory");
  });

  it("styles tablet grid and phone-friendly menu panels", () => {
    const css = read("app/dashboard/restaurants/[id]/kds-workspace.css");

    expect(css).toContain("Menu setup responsive (prompt 27)");
    expect(css).toMatch(
      /@media \(min-width: 768px\)[\s\S]*\.menu-setup-primary__grid[\s\S]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/
    );
    expect(css).toMatch(
      /@media \(max-width: 639px\)[\s\S]*\.kds-live-menu[\s\S]*max-height:\s*min\(44svh,\s*340px\)/
    );
    expect(css).toContain(".menu-import-history__file");
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
    expect(indicator).toContain('from("draft_orders")');
    expect(indicator).toContain('role="status"');
    expect(indicator).not.toMatch(/demo|fake|placeholder/i);
  });
});
