import type { PlanDefinition, PlanLimits } from "@/lib/billing/plans";

export type BillingPlanId = "starter" | "growth" | "enterprise";

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "paused";

/** Effective status shown in UI when Stripe is not wired. */
export type EffectiveSubscriptionStatus = SubscriptionStatus | "dev";

export type BillingProviderMode = "dev" | "stripe";

export type PlanFeatureKey =
  | "menu_scan"
  | "voice_agent"
  | "kds_orders"
  | "multi_location"
  | "priority_support"
  | "api_access";

export type UsageLimitKey =
  | "active_locations"
  | "menu_scans"
  | "voice_orders"
  | "completed_orders"
  | "tool_calls";

export type LimitLevel = "ok" | "warning" | "exceeded";

export type LimitCheck = {
  key: UsageLimitKey;
  label: string;
  used: number;
  limit: number;
  percent: number;
  level: LimitLevel;
  unitLabel: string;
};

export type FeatureEntitlement = {
  key: PlanFeatureKey;
  label: string;
  enabled: boolean;
};

export type BillingScope = "organization" | "restaurant";

export type BillingUsageSnapshot = {
  menuScans: number;
  /** Receipt-backed successful phone orders in the billing period (billable). */
  billablePhoneOrders: number;
  estimatedBillableChargeUsd: number;
  toolCalls: number;
  importAttempts: number;
  activeLocations: number;
  restaurantCount: number;
};

export type BillingSnapshot = {
  scope: BillingScope;
  restaurantId: string | null;
  restaurantName: string | null;
  providerMode: BillingProviderMode;
  providerConfigured: boolean;
  checkoutEnabled: boolean;
  stripeCustomerLinked: boolean;
  organizationId: string;
  organizationName: string;
  plan: PlanDefinition;
  effectiveLimits: PlanLimits;
  subscriptionStatus: SubscriptionStatus;
  effectiveStatus: EffectiveSubscriptionStatus;
  trialEndsAt: string | null;
  trialDaysRemaining: number | null;
  isTrialActive: boolean;
  periodStart: string;
  periodEnd: string;
  usage: BillingUsageSnapshot;
  limitChecks: LimitCheck[];
  features: FeatureEntitlement[];
  canManageBilling: boolean;
  upgradePlanIds: BillingPlanId[];
};

export type OrganizationBillingRow = {
  id: string;
  name: string;
  billing_plan: BillingPlanId;
  subscription_status: SubscriptionStatus;
  trial_ends_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  billing_period_start: string | null;
  billing_period_end: string | null;
};
