import type { BillingPlanId, PlanFeatureKey } from "@/lib/billing/types";

export type PlanLimits = {
  max_active_locations: number;
  max_menu_scans_per_period: number;
  max_voice_orders_per_period: number;
  max_completed_orders_per_period: number;
  max_tool_calls_per_period: number;
};

export type PlanDefinition = {
  id: BillingPlanId;
  name: string;
  description: string;
  monthlyPriceUsd: number | null;
  limits: PlanLimits;
  features: Record<PlanFeatureKey, boolean>;
  highlighted?: boolean;
};

const UNLIMITED = 1_000_000;

/** Generous caps when Stripe is not configured (local dev). */
export const DEV_MODE_LIMITS: PlanLimits = {
  max_active_locations: 50,
  max_menu_scans_per_period: UNLIMITED,
  max_voice_orders_per_period: UNLIMITED,
  max_completed_orders_per_period: UNLIMITED,
  max_tool_calls_per_period: UNLIMITED,
};

export const BILLING_PLANS: Record<BillingPlanId, PlanDefinition> = {
  starter: {
    id: "starter",
    name: "Starter",
    description: "One or two locations getting started with voice ordering and menu scans.",
    monthlyPriceUsd: 149,
    limits: {
      max_active_locations: 2,
      max_menu_scans_per_period: 40,
      max_voice_orders_per_period: 150,
      max_completed_orders_per_period: 120,
      max_tool_calls_per_period: 2_000,
    },
    features: {
      menu_scan: true,
      voice_agent: true,
      kds_orders: true,
      multi_location: false,
      priority_support: false,
      api_access: false,
    },
  },
  growth: {
    id: "growth",
    name: "Growth",
    description: "Multi-location groups with higher scan and call volume.",
    monthlyPriceUsd: 399,
    highlighted: true,
    limits: {
      max_active_locations: 10,
      max_menu_scans_per_period: 200,
      max_voice_orders_per_period: 800,
      max_completed_orders_per_period: 600,
      max_tool_calls_per_period: 15_000,
    },
    features: {
      menu_scan: true,
      voice_agent: true,
      kds_orders: true,
      multi_location: true,
      priority_support: true,
      api_access: false,
    },
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    description: "Custom limits, SLAs, and integrations for large brands.",
    monthlyPriceUsd: null,
    limits: {
      max_active_locations: UNLIMITED,
      max_menu_scans_per_period: UNLIMITED,
      max_voice_orders_per_period: UNLIMITED,
      max_completed_orders_per_period: UNLIMITED,
      max_tool_calls_per_period: UNLIMITED,
    },
    features: {
      menu_scan: true,
      voice_agent: true,
      kds_orders: true,
      multi_location: true,
      priority_support: true,
      api_access: true,
    },
  },
};

export function getPlan(planId: BillingPlanId): PlanDefinition {
  return BILLING_PLANS[planId] ?? BILLING_PLANS.starter;
}

/**
 * Pricing is $0.90 per completed order with no tiers, so no plan caps usage. The tier limits
 * above stay for reference only. Inactive plans are still gated by subscription status.
 */
export function effectivePlanLimits(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept for callers; tiers no longer cap usage
  _plan: PlanDefinition,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _providerMode: "dev" | "stripe"
): PlanLimits {
  return DEV_MODE_LIMITS;
}

export const PLAN_FEATURE_LABELS: Record<PlanFeatureKey, string> = {
  menu_scan: "Menu scan & import",
  voice_agent: "Phone host that takes orders",
  kds_orders: "Kitchen display & orders",
  multi_location: "Multiple locations",
  priority_support: "Priority support",
  api_access: "API & webhooks",
};
