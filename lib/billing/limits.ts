import {
  effectivePlanLimits,
  getPlan,
  PLAN_FEATURE_LABELS,
} from "@/lib/billing/plans";
import type {
  BillingPlanId,
  BillingProviderMode,
  BillingScope,
  BillingUsageSnapshot,
  EffectiveSubscriptionStatus,
  FeatureEntitlement,
  LimitCheck,
  LimitLevel,
  PlanFeatureKey,
  SubscriptionStatus,
  UsageLimitKey,
} from "@/lib/billing/types";

const WARNING_RATIO = 0.8;

export function computeLimitLevel(used: number, limit: number): LimitLevel {
  if (limit >= 1_000_000) return "ok";
  if (used >= limit) return "exceeded";
  if (used >= limit * WARNING_RATIO) return "warning";
  return "ok";
}

function percent(used: number, limit: number): number {
  if (limit >= 1_000_000) return 0;
  if (limit <= 0) return used > 0 ? 100 : 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

export function buildLimitChecks(
  usage: BillingUsageSnapshot,
  limits: ReturnType<typeof effectivePlanLimits>,
  options?: { scope?: BillingScope }
): LimitCheck[] {
  const scope = options?.scope ?? "organization";
  const rows: Array<{
    key: UsageLimitKey;
    label: string;
    used: number;
    limit: number;
    unitLabel: string;
  }> = [];

  if (scope === "organization") {
    rows.push({
      key: "active_locations",
      label: "Active locations",
      used: Math.max(usage.activeLocations, usage.restaurantCount),
      limit: limits.max_active_locations,
      unitLabel: "locations",
    });
  }

  rows.push(
    {
      key: "menu_scans",
      label: "Menu scans",
      used: usage.menuScans,
      limit: limits.max_menu_scans_per_period,
      unitLabel: "scans",
    },
    {
      key: "voice_orders",
      label: "Voice orders",
      used: usage.voiceOrders,
      limit: limits.max_voice_orders_per_period,
      unitLabel: "orders",
    },
    {
      key: "completed_orders",
      label: "Completed orders",
      used: usage.completedOrders,
      limit: limits.max_completed_orders_per_period,
      unitLabel: "orders",
    },
    {
      key: "tool_calls",
      label: "Agent tool calls",
      used: usage.toolCalls,
      limit: limits.max_tool_calls_per_period,
      unitLabel: "calls",
    }
  );

  return rows.map((row) => ({
    ...row,
    percent: percent(row.used, row.limit),
    level: computeLimitLevel(row.used, row.limit),
  }));
}

export function buildFeatureEntitlements(
  planId: BillingPlanId
): FeatureEntitlement[] {
  const plan = getPlan(planId);
  return (Object.keys(PLAN_FEATURE_LABELS) as PlanFeatureKey[]).map((key) => ({
    key,
    label: PLAN_FEATURE_LABELS[key],
    enabled: plan.features[key],
  }));
}

export function trialDaysRemaining(trialEndsAt: string | null): number | null {
  if (!trialEndsAt) return null;
  const end = new Date(trialEndsAt).getTime();
  const diff = end - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}

export function isTrialActive(
  status: SubscriptionStatus,
  trialEndsAt: string | null
): boolean {
  if (status !== "trialing") return false;
  const days = trialDaysRemaining(trialEndsAt);
  return days === null || days > 0;
}

export function resolveEffectiveStatus(
  status: SubscriptionStatus,
  providerMode: BillingProviderMode
): EffectiveSubscriptionStatus {
  if (providerMode === "dev") return "dev";
  return status;
}

export function statusLabel(
  status: SubscriptionStatus | "dev"
): string {
  switch (status) {
    case "trialing":
      return "Trial";
    case "active":
      return "Active";
    case "past_due":
      return "Past due";
    case "canceled":
      return "Canceled";
    case "paused":
      return "Paused";
    case "dev":
      return "Development";
    default:
      return status;
  }
}
