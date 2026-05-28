import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");
const read = (rel: string) => readFileSync(join(REPO, rel), "utf8");

describe("workspace safe-area responsive (prompt 22)", () => {
  it("defines stacked sticky offsets for mobile workspace chrome", () => {
    const css = read("app/dashboard/restaurants/[id]/kds-workspace.css");
    expect(css).toContain("Safe-area & sticky stack (prompt 22)");
    expect(css).toContain("--kds-workspace-sticky-top");
    expect(css).toContain("--kds-workspace-bottom-offset");
    expect(css).toMatch(
      /\.kds-panel-sticky-head[\s\S]*top:\s*var\(--kds-workspace-sticky-top\)/
    );
  });

  it("keeps order detail modal above bottom rail with safe-area padding", () => {
    const modal = read("app/dashboard/restaurants/[id]/OrderDetailModal.tsx");
    const css = read("app/dashboard/restaurants/[id]/kds-workspace.css");

    expect(modal).toContain("kds-order-detail-dialog");
    expect(modal).toContain("kds-order-detail-dialog__footer");
    expect(modal).toContain("kds-modal-layer");
    expect(css).toContain(".kds-order-detail-dialog__panel");
    expect(css).toContain("safe-area-inset-bottom");
  });

  it("elevates menu scanner dialog to the workspace modal layer", () => {
    const scanner = read("app/dashboard/restaurants/[id]/MenuScanner.tsx");
    expect(scanner).toContain("kds-modal-layer");
    expect(scanner).not.toContain("relative z-50");
  });
});
