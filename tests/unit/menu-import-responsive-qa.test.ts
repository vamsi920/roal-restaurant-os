import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");
const read = (rel: string) => readFileSync(join(REPO, rel), "utf8");

describe("menu import responsive (prompt 30)", () => {
  it("wraps import history filenames, errors, and timestamps", () => {
    const history = read("components/menu-import/MenuImportHistory.tsx");
    const css = read("app/dashboard/restaurants/[id]/kds-workspace.css");

    expect(history).toContain("menu-import-history");
    expect(history).toContain("menu-import-history__status-error");
    expect(history).toContain("[overflow-wrap:anywhere]");
    expect(history).toContain("dashboard-table");
    expect(history).toContain("xl:min-w-[640px]");
    expect(history).not.toContain("max-w-[200px]");
    expect(history).toContain("formatApiRouteError");
    expect(css).toContain("Menu import history + review (prompt 30)");
    expect(css).toMatch(
      /@media \(max-width: 767px\)[\s\S]*\.menu-import-history__table[\s\S]*flex-direction:\s*column/
    );
  });

  it("styles review hint and action regions for narrow screens", () => {
    const review = read("components/menu-import/MenuImportReview.tsx");
    const css = read("app/dashboard/restaurants/[id]/kds-workspace.css");

    expect(review).toContain("menu-import-review__hints");
    expect(review).toContain("menu-import-review__stats");
    expect(review).toContain("menu-import-review__actions");
    expect(review).toContain("min-h-11 w-full");
    expect(review).not.toMatch(/text-\[10px\]|text-\[11px\]/);
    expect(css).toContain(".menu-import-review__stats span");
  });

  it("loads real import rows from the restaurant API", () => {
    const history = read("components/menu-import/MenuImportHistory.tsx");
    expect(history).toContain("/api/restaurants/${restaurantId}/menu-imports");
    expect(history).toContain("MenuImportListItem");
    expect(history).not.toMatch(/demo|fake|placeholder/i);
  });
});
