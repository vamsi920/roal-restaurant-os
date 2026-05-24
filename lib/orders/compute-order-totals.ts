import type { ParsedLineItem } from "@/lib/orders/line-items";
import {
  findMenuItemByName,
  findModifierPrice,
  type MenuPriceContext,
} from "@/lib/orders/menu-price-context";
import { centsToDollars, dollarsToCents, roundCents } from "@/lib/orders/money";
import type { OrderPricingSettings } from "@/lib/orders/pricing-settings";
import { DEFAULT_ORDER_PRICING } from "@/lib/orders/pricing-settings";

export type ComputedLineTotal = {
  name: string;
  quantity: number;
  unitPrice: number | null;
  modifierTotal: number;
  lineTotal: number | null;
  lineTotalCents: number | null;
  matchedMenu: boolean;
};

export type OrderTotals = {
  lines: ComputedLineTotal[];
  subtotalCents: number | null;
  subtotal: number | null;
  discountCents: number;
  discount: number;
  serviceFeeCents: number;
  serviceFee: number;
  taxCents: number;
  tax: number;
  totalCents: number | null;
  total: number | null;
  unmatchedCount: number;
  complete: boolean;
  taxRatePercent: number;
  serviceFeePercent: number;
  disclaimer: string;
};

function percentOfCents(baseCents: number, percent: number): number {
  if (baseCents <= 0 || percent <= 0) return 0;
  return Math.round((baseCents * percent) / 100);
}

function computeDiscountCents(
  subtotalCents: number,
  settings: OrderPricingSettings
): number {
  if (subtotalCents <= 0) return 0;
  const fromPercent = percentOfCents(subtotalCents, settings.discountPercent);
  const fromFixed = Math.max(0, settings.discountAmountCents);
  return Math.min(subtotalCents, fromPercent + fromFixed);
}

/**
 * Deterministic order total: line prices → subtotal → discount → service fee → tax → total.
 * All arithmetic uses integer cents.
 */
export function computeOrderTotals(
  lineItems: ParsedLineItem[],
  menuCtx: MenuPriceContext | null,
  settings: OrderPricingSettings = DEFAULT_ORDER_PRICING
): OrderTotals {
  const lines: ComputedLineTotal[] = [];
  let subtotalCents = 0;
  let unmatchedCount = 0;

  for (const line of lineItems) {
    const menuItem = menuCtx ? findMenuItemByName(line.name, menuCtx) : null;
    const matchedMenu = !!menuItem;

    let unitPrice = line.unitPrice;
    if (unitPrice != null) unitPrice = roundCents(unitPrice);
    if (unitPrice == null && menuItem?.price != null) {
      unitPrice = roundCents(menuItem.price);
    }

    let modifierTotal = 0;
    if (menuCtx && line.customizations.length > 0) {
      for (const mod of line.customizations) {
        const p = findModifierPrice(mod, menuCtx);
        if (p != null) modifierTotal += roundCents(p);
      }
    }
    modifierTotal = roundCents(modifierTotal);

    let lineTotal: number | null = null;
    let lineTotalCents: number | null = null;
    if (unitPrice != null) {
      const unitCents = dollarsToCents(unitPrice + modifierTotal);
      lineTotalCents = unitCents * line.quantity;
      lineTotal = centsToDollars(lineTotalCents);
      subtotalCents += lineTotalCents;
    } else {
      unmatchedCount += 1;
    }

    lines.push({
      name: line.name,
      quantity: line.quantity,
      unitPrice,
      modifierTotal,
      lineTotal,
      lineTotalCents,
      matchedMenu,
    });
  }

  const complete = lineItems.length > 0 && unmatchedCount === 0;
  const taxRatePercent = settings.taxRatePercent;
  const serviceFeePercent = settings.serviceFeePercent;

  if (!complete) {
    return {
      lines,
      subtotalCents: subtotalCents > 0 ? subtotalCents : null,
      subtotal: subtotalCents > 0 ? centsToDollars(subtotalCents) : null,
      discountCents: 0,
      discount: 0,
      serviceFeeCents: 0,
      serviceFee: 0,
      taxCents: 0,
      tax: 0,
      totalCents: null,
      total: null,
      unmatchedCount,
      complete: false,
      taxRatePercent,
      serviceFeePercent,
      disclaimer:
        unmatchedCount > 0
          ? "Some items could not be matched to menu prices. Totals are incomplete."
          : "Add line items to calculate totals.",
    };
  }

  const discountCents = computeDiscountCents(subtotalCents, settings);
  const afterDiscountCents = subtotalCents - discountCents;
  const serviceFeeCents = percentOfCents(afterDiscountCents, serviceFeePercent);
  const taxableCents = afterDiscountCents + serviceFeeCents;
  const taxCents = percentOfCents(taxableCents, taxRatePercent);
  const totalCents = taxableCents + taxCents;

  const disclaimer =
    discountCents > 0
      ? "Includes configured discount. Confirm at pickup."
      : "Calculated from menu prices and restaurant tax/service settings.";

  return {
    lines,
    subtotalCents,
    subtotal: centsToDollars(subtotalCents),
    discountCents,
    discount: centsToDollars(discountCents),
    serviceFeeCents,
    serviceFee: centsToDollars(serviceFeeCents),
    taxCents,
    tax: centsToDollars(taxCents),
    totalCents,
    total: centsToDollars(totalCents),
    unmatchedCount: 0,
    complete: true,
    taxRatePercent,
    serviceFeePercent,
    disclaimer,
  };
}
