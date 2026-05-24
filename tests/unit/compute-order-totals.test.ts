import { describe, expect, it } from "vitest";
import { computeOrderTotals } from "@/lib/orders/compute-order-totals";
import { parseOrderLineItems } from "@/lib/orders/line-items";
import { buildMenuPriceContext } from "@/lib/orders/menu-price-context";
import { orderPricingFromProfile } from "@/lib/orders/pricing-settings";
import {
  ITEM_SOLD_OUT_ID,
  menuItems,
  menuModifiers,
} from "../fixtures/menu";
import type { DbItem } from "@/lib/types";
import { validateCartForFinalize } from "@/lib/orders/validate-cart";

const pricing = {
  taxRatePercent: 8.875,
  serviceFeePercent: 10,
  discountPercent: 0,
  discountAmountCents: 0,
};

describe("computeOrderTotals", () => {
  const ctx = buildMenuPriceContext(menuItems, menuModifiers);

  it("sums item price, modifier price, and quantity in cents", () => {
    const lines = parseOrderLineItems([
      {
        name: "Classic Burger",
        quantity: 2,
        customizations: ["Extra cheese"],
      },
    ]);
    const totals = computeOrderTotals(lines, ctx, pricing);
    expect(totals.complete).toBe(true);
    expect(totals.subtotal).toBe(28);
    expect(totals.lines[0].modifierTotal).toBe(1.5);
    expect(totals.lines[0].lineTotal).toBe(28);
  });

  it("applies service fee then tax on discounted subtotal", () => {
    const lines = parseOrderLineItems([
      { name: "Classic Burger", quantity: 1 },
    ]);
    const totals = computeOrderTotals(lines, ctx, {
      ...pricing,
      discountPercent: 10,
    });
    expect(totals.discount).toBe(1.25);
    expect(totals.serviceFee).toBe(1.13);
    expect(totals.tax).toBe(1.1);
    expect(totals.total).toBe(13.48);
  });

  it("marks totals incomplete when menu price is missing", () => {
    const items: DbItem[] = [
      {
        ...menuItems[0],
        id: "no-price",
        name: "Priceless Burger",
        price: null,
      },
    ];
    const menuCtx = buildMenuPriceContext(items, []);
    const totals = computeOrderTotals(
      parseOrderLineItems([{ name: "Priceless Burger", quantity: 1 }]),
      menuCtx,
      pricing
    );
    expect(totals.complete).toBe(false);
    expect(totals.total).toBeNull();
    expect(totals.unmatchedCount).toBe(1);
  });

  it("uses explicit line unit_price when provided", () => {
    const totals = computeOrderTotals(
      parseOrderLineItems([
        { name: "Unknown Item", quantity: 1, unit_price: 7.5 },
      ]),
      ctx,
      pricing
    );
    expect(totals.complete).toBe(true);
    expect(totals.subtotal).toBe(7.5);
  });

  it("returns incomplete totals for an empty cart", () => {
    const totals = computeOrderTotals([], ctx, pricing);
    expect(totals.complete).toBe(false);
    expect(totals.total).toBeNull();
    expect(totals.disclaimer).toContain("Add line items");
  });

  it("applies tax and service fee from restaurant profile", () => {
    const profilePricing = orderPricingFromProfile({
      tax_rate_percent: 8.875,
      service_fee_percent: 10,
    });
    const totals = computeOrderTotals(
      parseOrderLineItems([{ name: "Classic Burger", quantity: 1 }]),
      ctx,
      profilePricing
    );
    expect(totals.complete).toBe(true);
    expect(totals.taxRatePercent).toBe(8.875);
    expect(totals.serviceFeePercent).toBe(10);
    expect(totals.serviceFee).toBe(1.25);
    expect(totals.tax).toBe(1.22);
    expect(totals.total).toBe(14.97);
  });
});

describe("validateCartForFinalize (compute-totals API)", () => {
  it("rejects unknown item names", () => {
    const result = validateCartForFinalize(
      [{ name: "Mystery Taco", quantity: 1 }],
      menuItems,
      menuModifiers
    );
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === "unknown_item_name")).toBe(true);
  });

  it("rejects unavailable items", () => {
    const result = validateCartForFinalize(
      [{ item_id: ITEM_SOLD_OUT_ID, quantity: 1 }],
      menuItems,
      menuModifiers
    );
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === "item_unavailable")).toBe(true);
  });

  it("rejects empty cart", () => {
    const result = validateCartForFinalize([], menuItems, menuModifiers);
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === "empty_cart")).toBe(true);
  });
});
