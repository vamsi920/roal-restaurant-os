import type { RestaurantProfile } from "@/lib/types";

/** Restaurant tax/service + discount placeholder (future promotions). */
export type OrderPricingSettings = {
  taxRatePercent: number;
  serviceFeePercent: number;
  discountPercent: number;
  discountAmountCents: number;
};

export const DEFAULT_ORDER_PRICING: OrderPricingSettings = {
  taxRatePercent: 0,
  serviceFeePercent: 0,
  discountPercent: 0,
  discountAmountCents: 0,
};

export function orderPricingFromProfile(
  profile: Pick<RestaurantProfile, "tax_rate_percent" | "service_fee_percent">
): OrderPricingSettings {
  return {
    taxRatePercent: clampPercent(Number(profile.tax_rate_percent) || 0),
    serviceFeePercent: clampPercent(Number(profile.service_fee_percent) || 0),
    discountPercent: 0,
    discountAmountCents: 0,
  };
}

function clampPercent(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0;
  if (n > 100) return 100;
  return n;
}
