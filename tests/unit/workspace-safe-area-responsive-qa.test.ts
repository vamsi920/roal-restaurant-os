import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");
const read = (rel: string) => readFileSync(join(REPO, rel), "utf8");

describe("workspace safe-area responsive (prompt 22)", () => {
  it("keeps the order and call drawers above page chrome with safe-area padding", () => {
    const drawer = read("components/live-orders/SideDrawer.tsx");
    const modal = read("app/dashboard/restaurants/[id]/OrderDetailModal.tsx");
    const calls = read("components/call-history/RestaurantCallHistoryPanel.tsx");

    expect(drawer).toContain('className="relative z-50"');
    expect(drawer).toContain("safe-area-inset-bottom");
    expect(drawer).toContain("max-h-[92dvh]");
    expect(modal).toContain("<SideDrawer");
    expect(calls).toContain("<SideDrawer");
  });

  it("elevates menu scanner clear-menu dialog above page chrome", () => {
    const scanner = read("app/dashboard/restaurants/[id]/MenuScanner.tsx");
    expect(scanner).toContain("<Dialog");
    expect(scanner).toContain('className="relative z-50"');
    expect(scanner).toContain("Clear entire menu?");
  });
});
