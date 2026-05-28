import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");
const read = (rel: string) => readFileSync(join(REPO, rel), "utf8");

describe("KDS tablet responsive (prompt 25)", () => {
  it("uses two-column order grids on tablet widths", () => {
    const css = read("app/dashboard/restaurants/[id]/kds-workspace.css");

    expect(css).toContain("KDS tablet / iPad layout (prompt 25)");
    expect(css).toMatch(
      /@media \(min-width: 768px\) and \(max-width: 1023px\)[\s\S]*\.kds-order-list[\s\S]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/
    );
    expect(css).toMatch(
      /@media \(min-width: 768px\) and \(max-width: 1023px\)[\s\S]*\.kds-order-list--live[\s\S]*grid-template-columns:\s*repeat\(2/
    );
  });

  it("segments tabs without horizontal scroll on tablet", () => {
    const css = read("app/dashboard/restaurants/[id]/kds-workspace.css");
    const panel = read("app/dashboard/restaurants/[id]/LiveOrdersPanel.tsx");

    expect(css).toMatch(
      /@media \(min-width: 768px\) and \(max-width: 1023px\)[\s\S]*\.kds-order-tabs[\s\S]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/
    );
    expect(css).toMatch(
      /@media \(min-width: 768px\) and \(max-width: 1023px\)[\s\S]*\.kds-order-tabs[\s\S]*overflow-x:\s*visible/
    );
    expect(panel).toContain("kds-order-tab");
    expect(panel).not.toContain("sm:min-w-[7rem]");
    expect(panel).toContain("lg:min-w-[7rem]");
  });

  it("keeps orders canvas full width in workspace main", () => {
    const page = read("app/dashboard/restaurants/[id]/page.tsx");
    const panel = read("app/dashboard/restaurants/[id]/LiveOrdersPanel.tsx");

    expect(page).toContain("kds-workspace--orders");
    expect(page).toContain("min-w-0 w-full");
    expect(panel).toContain("kds-orders-canvas");
    expect(panel).toContain("overflow-hidden");
    expect(panel).toContain("KitchenOrderCard");
  });
});
