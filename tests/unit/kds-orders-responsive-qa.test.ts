import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");
const read = (rel: string) => readFileSync(join(REPO, rel), "utf8");

describe("KDS orders responsive (prompt 23)", () => {
  it("keeps tab counts visible and labels tabs for screen readers", () => {
    const panel = read("app/dashboard/restaurants/[id]/LiveOrdersPanel.tsx");
    const css = read("app/dashboard/restaurants/[id]/kds-workspace.css");

    expect(panel).toContain("kds-order-tab__count");
    expect(panel).toContain("aria-label={`${label}, ${count} orders`}");
    expect(css).toContain("KDS orders responsive (prompt 23)");
    expect(css).not.toMatch(
      /\.kds-order-tab\[aria-selected="true"\][\s\S]*> span:last-child[\s\S]*display:\s*none/
    );
    expect(css).toContain(".kds-order-tab__count");
  });

  it("stacks sync banners and uses formatted client errors", () => {
    const panel = read("app/dashboard/restaurants/[id]/LiveOrdersPanel.tsx");
    const css = read("app/dashboard/restaurants/[id]/kds-workspace.css");

    expect(panel).toContain("formatSupabaseClientError");
    expect(css).toMatch(
      /@media \(max-width: 639px\)[\s\S]*\.kds-orders-sync-alert[\s\S]*flex-direction:\s*column/
    );
    expect(css).toMatch(
      /@media \(max-width: 639px\)[\s\S]*\.kds-recovery-btn[\s\S]*width:\s*100%/
    );
  });

  it("styles scrollable tabs and compact call strip on phone", () => {
    const css = read("app/dashboard/restaurants/[id]/kds-workspace.css");
    const strip = read("app/dashboard/restaurants/[id]/CallStatusStrip.tsx");

    expect(css).toMatch(/\.kds-order-tabs[\s\S]*scroll-snap-type/);
    expect(css).toMatch(
      /@media \(max-width: 639px\)[\s\S]*\.kds-order-tab[\s\S]*min-width:\s*5\.75rem/
    );
    expect(strip).toContain("kds-call-status__updated");
    expect(strip).toContain("truncate");
  });
});
