import { isTestHarnessBillingSession } from "@/lib/billing/billable-orders";

function isTruthyHarnessFlag(value: unknown): boolean {
  return value === true || value === "true";
}

/** Test/harness calls must not trigger production owner alerts. */
export function shouldSkipProductionOwnerNotification(
  sessionId: string,
  metadata?: Record<string, unknown> | null
): boolean {
  if (isTestHarnessBillingSession(sessionId)) return true;
  if (metadata && isTruthyHarnessFlag(metadata.is_test_harness)) return true;
  return false;
}
