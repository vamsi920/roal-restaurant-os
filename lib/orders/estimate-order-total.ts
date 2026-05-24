import type { ParsedLineItem } from "@/lib/orders/line-items";
import type { MenuPriceContext } from "@/lib/orders/menu-price-context";
import { computeOrderTotals, type OrderTotals } from "@/lib/orders/compute-order-totals";
import type { OrderPricingSettings } from "@/lib/orders/pricing-settings";
import { DEFAULT_ORDER_PRICING } from "@/lib/orders/pricing-settings";

export type { ComputedLineTotal, OrderTotals } from "@/lib/orders/compute-order-totals";
/** @deprecated Use computeOrderTotals */
export type EstimatedLineTotal = OrderTotals["lines"][number];

/** @deprecated Use OrderTotals */
export type OrderTotalsEstimate = OrderTotals;

export function estimateOrderTotals(
  lineItems: ParsedLineItem[],
  menuCtx: MenuPriceContext | null,
  settings: OrderPricingSettings = DEFAULT_ORDER_PRICING
): OrderTotals {
  return computeOrderTotals(lineItems, menuCtx, settings);
}
