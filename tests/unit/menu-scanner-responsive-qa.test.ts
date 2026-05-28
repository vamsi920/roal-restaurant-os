import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");
const read = (rel: string) => readFileSync(join(REPO, rel), "utf8");

describe("menu scanner responsive (prompt 28)", () => {
  it("uses thumb-friendly upload and action regions", () => {
    const scanner = read("app/dashboard/restaurants/[id]/MenuScanner.tsx");
    const css = read("app/dashboard/restaurants/[id]/kds-workspace.css");

    expect(scanner).toContain("menu-scanner__upload");
    expect(scanner).toContain("menu-scanner__actions");
    expect(scanner).toContain("min-h-11 w-full");
    expect(scanner).toContain('role="alert"');
    expect(scanner).toContain("Discard failed import");
    expect(css).toContain("Menu scanner / upload phone (prompt 28)");
    expect(css).toMatch(
      /@media \(max-width: 639px\)[\s\S]*\.menu-scanner__actions[\s\S]*min-height:\s*2\.75rem/
    );
  });

  it("collapses import help on phone and keeps review actions sticky", () => {
    const scanner = read("app/dashboard/restaurants/[id]/MenuScanner.tsx");
    const review = read("components/menu-import/MenuImportReview.tsx");
    const css = read("app/dashboard/restaurants/[id]/kds-workspace.css");

    expect(scanner).toContain("menu-scanner__import-flow");
    expect(scanner).toContain("menu-scanner__import-flow-desktop");
    expect(scanner).toContain("sm:hidden");
    expect(review).toContain("menu-import-review__actions");
    expect(review).toContain("min-h-11 w-full");
    expect(review).toContain("grid-cols-1 gap-2 sm:grid-cols-3");
    expect(css).toMatch(
      /@media \(max-width: 639px\)[\s\S]*\.menu-import-review__actions[\s\S]*position:\s*sticky/
    );
  });

  it("preserves real scanner APIs and error formatting", () => {
    const scanner = read("app/dashboard/restaurants/[id]/MenuScanner.tsx");
    expect(scanner).toContain("formatScannerApiError");
    expect(scanner).toContain("MenuImportReview");
    expect(scanner).not.toMatch(/demo|fake|placeholder menu/i);
  });
});
