import type { SupabaseClient } from "@supabase/supabase-js";
import { isOrgAdmin } from "@/lib/auth/roles";
import type { MembershipRole } from "@/lib/types";
import {
  buildFeatureEntitlements,
  buildLimitChecks,
  isTrialActive,
  resolveEffectiveStatus,
  trialDaysRemaining,
} from "@/lib/billing/limits";
import {
  effectivePlanLimits,
  getPlan,
} from "@/lib/billing/plans";
import { getBillingProviderConfig } from "@/lib/billing/provider";
import type {
  BillingPlanId,
  BillingSnapshot,
  OrganizationBillingRow,
} from "@/lib/billing/types";
import { getUsageSummary } from "@/lib/usage/query";
import type { UsageSummary } from "@/lib/usage/query";
import type { UsageEventType } from "@/lib/usage/types";

const PLAN_ORDER: BillingPlanId[] = ["starter", "growth", "enterprise"];

function countUsage(summary: UsageSummary, type: UsageEventType): number {
  return summary.byType.find((r) => r.event_type === type)?.count ?? 0;
}

function upgradePlanIds(current: BillingPlanId): BillingPlanId[] {
  const idx = PLAN_ORDER.indexOf(current);
  if (idx < 0) return PLAN_ORDER.slice(1);
  return PLAN_ORDER.slice(idx + 1);
}

export async function loadRestaurantBilling(
  supabase: SupabaseClient,
  input: {
    organizationId: string;
    membershipRole: MembershipRole;
    restaurantId: string;
    restaurantName: string;
  }
): Promise<BillingSnapshot | null> {
  return loadOrganizationBilling(supabase, {
    organizationId: input.organizationId,
    membershipRole: input.membershipRole,
    restaurantId: input.restaurantId,
    restaurantName: input.restaurantName,
  });
}

export async function loadOrganizationBilling(
  supabase: SupabaseClient,
  input: {
    organizationId: string;
    membershipRole: MembershipRole;
    restaurantId?: string;
    restaurantName?: string;
  }
): Promise<BillingSnapshot | null> {
  const scope: BillingSnapshot["scope"] = input.restaurantId
    ? "restaurant"
    : "organization";
  const { data: org, error } = await supabase
    .from("organizations")
    .select(
      `
      id,
      name,
      billing_plan,
      subscription_status,
      trial_ends_at,
      stripe_customer_id,
      stripe_subscription_id,
      billing_period_start,
      billing_period_end
    `
    )
    .eq("id", input.organizationId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!org) return null;

  const row = org as OrganizationBillingRow;
  const planId = (row.billing_plan ?? "starter") as BillingPlanId;
  const plan = getPlan(planId);
  const provider = getBillingProviderConfig();
  const effectiveLimits = effectivePlanLimits(plan, provider.mode);

  const periodStart = row.billing_period_start
    ? new Date(row.billing_period_start)
    : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const periodEnd = row.billing_period_end
    ? new Date(row.billing_period_end)
    : new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 1);

  const [usageSummary, restaurantCountResult] = await Promise.all([
    getUsageSummary(supabase, {
      organizationId: input.organizationId,
      restaurantId: input.restaurantId,
      since: periodStart,
      until: periodEnd,
    }),
    input.restaurantId
      ? Promise.resolve({ count: 1, error: null })
      : supabase
          .from("restaurants")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", input.organizationId),
  ]);

  if (restaurantCountResult.error) {
    throw new Error(restaurantCountResult.error.message);
  }

  const usage = {
    menuScans: countUsage(usageSummary, "menu_scan"),
    voiceOrders: countUsage(usageSummary, "voice_order"),
    completedOrders: countUsage(usageSummary, "order_completed"),
    toolCalls: countUsage(usageSummary, "tool_call"),
    importAttempts: countUsage(usageSummary, "import_attempt"),
    activeLocations: usageSummary.activeLocations,
    restaurantCount: input.restaurantId
      ? 1
      : (restaurantCountResult.count ?? 0),
  };

  const subscriptionStatus = row.subscription_status ?? "trialing";
  const trialEndsAt = row.trial_ends_at;

  return {
    scope,
    restaurantId: input.restaurantId ?? null,
    restaurantName: input.restaurantName ?? null,
    providerMode: provider.mode,
    providerConfigured: provider.isConfigured,
    checkoutEnabled: provider.checkoutEnabled,
    stripeCustomerLinked: Boolean(row.stripe_customer_id?.trim()),
    organizationId: row.id,
    organizationName: row.name,
    plan,
    effectiveLimits,
    subscriptionStatus,
    effectiveStatus: resolveEffectiveStatus(subscriptionStatus, provider.mode),
    trialEndsAt,
    trialDaysRemaining: trialDaysRemaining(trialEndsAt),
    isTrialActive: isTrialActive(subscriptionStatus, trialEndsAt),
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    usage,
    limitChecks: buildLimitChecks(usage, effectiveLimits, { scope }),
    features: buildFeatureEntitlements(planId),
    canManageBilling: isOrgAdmin(input.membershipRole),
    upgradePlanIds: upgradePlanIds(planId),
  };
}
