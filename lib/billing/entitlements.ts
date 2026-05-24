import type { BillingSnapshot, PlanFeatureKey, UsageLimitKey } from "@/lib/billing/types";

export function hasPlanFeature(
  snapshot: BillingSnapshot,
  feature: PlanFeatureKey
): boolean {
  return snapshot.features.find((f) => f.key === feature)?.enabled ?? false;
}

export function limitCheckFor(
  snapshot: BillingSnapshot,
  key: UsageLimitKey
) {
  return snapshot.limitChecks.find((c) => c.key === key);
}

export function isUsageLimitExceeded(
  snapshot: BillingSnapshot,
  key: UsageLimitKey
): boolean {
  return limitCheckFor(snapshot, key)?.level === "exceeded";
}

export function isBillingOperational(snapshot: BillingSnapshot): boolean {
  if (snapshot.providerMode === "dev") return true;
  if (snapshot.effectiveStatus === "canceled") return false;
  if (snapshot.effectiveStatus === "past_due") return false;
  if (snapshot.isTrialActive) return true;
  return snapshot.effectiveStatus === "active";
}
