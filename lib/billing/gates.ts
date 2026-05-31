import { isBillingOperational, limitCheckFor } from "@/lib/billing/entitlements";
import { computeLimitLevel } from "@/lib/billing/limits";
import type { PlanLimits } from "@/lib/billing/plans";
import type {
  BillingSnapshot,
  LimitLevel,
  UsageLimitKey,
} from "@/lib/billing/types";

function limitForKey(limits: PlanLimits, key: UsageLimitKey): number {
  switch (key) {
    case "active_locations":
      return limits.max_active_locations;
    case "menu_scans":
      return limits.max_menu_scans_per_period;
    case "voice_orders":
      return limits.max_voice_orders_per_period;
    case "completed_orders":
      return limits.max_completed_orders_per_period;
    case "tool_calls":
      return limits.max_tool_calls_per_period;
  }
}

const UNIT_LABEL: Record<UsageLimitKey, string> = {
  active_locations: "locations",
  menu_scans: "scans",
  voice_orders: "orders",
  completed_orders: "orders",
  tool_calls: "calls",
};

function usedForLimitKey(
  snapshot: BillingSnapshot,
  limitKey: UsageLimitKey
): number {
  const check = limitCheckFor(snapshot, limitKey);
  if (check) return check.used;
  const u = snapshot.usage;
  switch (limitKey) {
    case "active_locations":
      return Math.max(u.activeLocations, u.restaurantCount);
    case "menu_scans":
      return u.menuScans;
    case "voice_orders":
      return u.billablePhoneOrders;
    case "completed_orders":
      return u.billablePhoneOrders;
    case "tool_calls":
      return u.toolCalls;
  }
}

export type BillingGateAction = "menu_scan" | "create_restaurant" | "voice_order";

const ACTION_LIMIT_KEY: Record<BillingGateAction, UsageLimitKey> = {
  menu_scan: "menu_scans",
  create_restaurant: "active_locations",
  voice_order: "voice_orders",
};

const ACTION_LABEL: Record<BillingGateAction, string> = {
  menu_scan: "Menu scans",
  create_restaurant: "Active locations",
  voice_order: "Voice orders",
};

export type GateVerdict = {
  action: BillingGateAction;
  level: LimitLevel;
  allowed: boolean;
  hardBlocked: boolean;
  title: string;
  message: string;
  limitKey: UsageLimitKey;
  used: number;
  projectedUsed: number;
  limit: number;
  unitLabel: string;
  showUpgrade: boolean;
  upgradeHref: string;
};

export type SerializableGateVerdict = GateVerdict;

function formatCount(n: number, limit: number): string {
  if (limit >= 1_000_000) return n.toLocaleString();
  return `${n.toLocaleString()} of ${limit.toLocaleString()}`;
}

function gateCopy(
  action: BillingGateAction,
  level: LimitLevel,
  projectedUsed: number,
  limit: number,
  unitLabel: string,
  hardBlocked: boolean,
  subscriptionBlocked: boolean
): Pick<GateVerdict, "title" | "message"> {
  const label = ACTION_LABEL[action];
  const usagePhrase = formatCount(projectedUsed, limit);

  if (subscriptionBlocked) {
    return {
      title: "Subscription inactive",
      message:
        "Your subscription is not active. Update billing to restore menu scans, new locations, and voice ordering.",
    };
  }

  if (hardBlocked) {
    if (action === "create_restaurant") {
      return {
        title: "Location limit reached",
        message: `Your plan includes up to ${limit.toLocaleString()} ${unitLabel}. Upgrade your plan to add another restaurant.`,
      };
    }
    if (action === "menu_scan") {
      return {
        title: "Menu scan limit reached",
        message: `You've used all menu scans for this billing period (${usagePhrase}). Upgrade your plan or wait until the next period resets.`,
      };
    }
    return {
      title: "Voice order limit reached",
      message: `You've used all voice orders for this billing period (${usagePhrase}). Upgrade your plan to keep answering calls with ROAL.`,
    };
  }

  if (level === "warning") {
    return {
      title: `${label} running low`,
      message: `You've used ${usagePhrase} ${unitLabel} this period. Consider upgrading before you hit your plan limit.`,
    };
  }

  return { title: label, message: "" };
}

export function evaluateBillingGate(
  snapshot: BillingSnapshot,
  action: BillingGateAction,
  options?: { additionalUsage?: number }
): GateVerdict {
  const limitKey = ACTION_LIMIT_KEY[action];
  const check = limitCheckFor(snapshot, limitKey);
  const used = usedForLimitKey(snapshot, limitKey);
  const limit =
    check?.limit ?? limitForKey(snapshot.effectiveLimits, limitKey);
  const unitLabel = check?.unitLabel ?? UNIT_LABEL[limitKey];
  const additional = options?.additionalUsage ?? 0;
  const projectedUsed = used + additional;
  const level = computeLimitLevel(projectedUsed, limit);

  const subscriptionBlocked =
    snapshot.providerMode === "stripe" && !isBillingOperational(snapshot);

  const hardBlocked =
    snapshot.providerMode === "stripe" &&
    (subscriptionBlocked || level === "exceeded");

  const allowed = !hardBlocked;
  const copy = gateCopy(
    action,
    level,
    projectedUsed,
    limit,
    unitLabel,
    hardBlocked,
    subscriptionBlocked
  );

  return {
    action,
    level: subscriptionBlocked ? "exceeded" : level,
    allowed,
    hardBlocked,
    title: copy.title,
    message: copy.message,
    limitKey,
    used,
    projectedUsed,
    limit,
    unitLabel,
    showUpgrade:
      snapshot.providerMode === "stripe" &&
      (hardBlocked || level === "warning"),
    upgradeHref: "/dashboard/billing",
  };
}

export function evaluateOrganizationGates(
  snapshot: BillingSnapshot
): Record<BillingGateAction, GateVerdict> {
  return {
    menu_scan: evaluateBillingGate(snapshot, "menu_scan", { additionalUsage: 1 }),
    create_restaurant: evaluateBillingGate(snapshot, "create_restaurant", {
      additionalUsage: 1,
    }),
    voice_order: evaluateBillingGate(snapshot, "voice_order", {
      additionalUsage: 1,
    }),
  };
}

export function gateVerdictForLimit(
  snapshot: BillingSnapshot,
  limitKey: UsageLimitKey,
  additionalUsage = 1
): GateVerdict | null {
  const entry = Object.entries(ACTION_LIMIT_KEY).find(([, k]) => k === limitKey);
  if (!entry) return null;
  return evaluateBillingGate(snapshot, entry[0] as BillingGateAction, {
    additionalUsage,
  });
}

export function isGateWarning(verdict: GateVerdict): boolean {
  return verdict.level === "warning" && !verdict.hardBlocked;
}
