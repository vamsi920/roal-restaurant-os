import { describe, expect, it } from "vitest";
import { orderTotalsPrintRows } from "@/components/orders/OrderTotalsBreakdown";
import type { OrderTotals } from "@/lib/orders/compute-order-totals";

function partialTotals(): OrderTotals {
  return {
    lines: [],
    subtotalCents: 1000,
    subtotal: 10,
    discountCents: 0,
    discount: 0,
    serviceFeeCents: 0,
    serviceFee: 0,
    taxCents: 0,
    tax: 0,
    totalCents: null,
    total: null,
    unmatchedCount: 1,
    complete: false,
    taxRatePercent: 0,
    serviceFeePercent: 0,
    disclaimer: "Incomplete",
  };
}

describe("orderTotalsPrintRows", () => {
  it("labels partial totals on print receipt", () => {
    const html = orderTotalsPrintRows(partialTotals());
    expect(html).toContain("(partial)");
    expect(html).not.toContain("Total</span><span>—</span>");
  });
});
