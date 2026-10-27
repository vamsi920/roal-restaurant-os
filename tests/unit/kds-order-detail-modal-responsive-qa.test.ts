import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");
const read = (rel: string) => readFileSync(join(REPO, rel), "utf8");

describe("Order drawer (v3)", () => {
  it("is a bottom sheet on phones and a right drawer from sm up", () => {
    const drawer = read("components/live-orders/SideDrawer.tsx");

    expect(drawer).toContain("items-end justify-end");
    expect(drawer).toContain("rounded-t-[18px]");
    expect(drawer).toContain("sm:h-full");
    expect(drawer).toContain("sm:rounded-l-[18px]");
    expect(drawer).toContain("motion-reduce:transition-none");
  });

  it("closes on Esc via the dialog, focuses close, and returns focus", () => {
    const drawer = read("components/live-orders/SideDrawer.tsx");
    const modal = read("app/dashboard/restaurants/[id]/OrderDetailModal.tsx");

    expect(drawer).toContain("@headlessui/react");
    expect(drawer).toContain("onClose={onClose}");
    expect(drawer).toContain("closeRef.current?.focus()");
    expect(modal).toContain('titleId="kds-order-detail-title"');
    expect(modal).toContain("OrderActionButton");
    expect(modal).toContain('role="alert"');
    expect(modal).toContain("footer={footer}");
  });

  it("preserves real order sections, transcript, and print affordance", () => {
    const modal = read("app/dashboard/restaurants/[id]/OrderDetailModal.tsx");

    expect(modal).toContain("OrderTotalsBreakdown");
    expect(modal).toContain("computeOrderTotals");
    expect(modal).toContain("TranscriptBubbles");
    expect(modal).toContain("Print receipt");
    expect(modal).toContain("Call reference");
  });
});
