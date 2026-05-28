import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");
const read = (rel: string) => readFileSync(join(REPO, rel), "utf8");

describe("KDS order detail modal responsive (prompt 26)", () => {
  it("uses bottom sheet on phone and centered modal on desktop", () => {
    const modal = read("app/dashboard/restaurants/[id]/OrderDetailModal.tsx");
    const css = read("app/dashboard/restaurants/[id]/kds-workspace.css");

    expect(modal).toContain("kds-order-detail-dialog__grabber");
    expect(modal).toContain("items-end");
    expect(modal).toContain("sm:items-center");
    expect(modal).toContain("sm:max-w-lg");
    expect(modal).toContain("rounded-t-2xl");
    expect(modal).toContain("sm:rounded-2xl");
    expect(css).toMatch(
      /@media \(max-width: 639px\)[\s\S]*\.kds-order-detail-dialog__panel[\s\S]*border-bottom-left-radius:\s*0/
    );
  });

  it("keeps close focus and status actions in the sticky footer", () => {
    const modal = read("app/dashboard/restaurants/[id]/OrderDetailModal.tsx");

    expect(modal).toContain("closeRef");
    expect(modal).toContain("closeRef.current?.focus()");
    expect(modal).toContain('aria-labelledby="kds-order-detail-title"');
    expect(modal).toContain("kds-order-detail-dialog__actions");
    expect(modal).toContain("kds-order-detail-dialog__footer");
    expect(modal).toContain("OrderActionButton");
    expect(modal).toContain('role="alert"');
    expect(modal.indexOf("kds-order-detail-dialog__actions")).toBeGreaterThan(
      modal.indexOf("kds-order-detail-dialog__body")
    );
  });

  it("preserves real order sections and print affordance", () => {
    const modal = read("app/dashboard/restaurants/[id]/OrderDetailModal.tsx");

    expect(modal).toContain("OrderTotalsBreakdown");
    expect(modal).toContain("computeOrderTotals");
    expect(modal).toContain("Print receipt");
    expect(modal).toContain("Call reference");
  });
});
