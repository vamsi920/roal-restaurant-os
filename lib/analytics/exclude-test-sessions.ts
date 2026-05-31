import { isTestHarnessBillingSession } from "@/lib/billing/billable-orders";

export function isAnalyticsExcludedSession(
  sessionId: string | null | undefined
): boolean {
  return isTestHarnessBillingSession(sessionId);
}

export function excludeTestHarnessSessions<
  T extends { session_id?: string | null },
>(rows: T[]): T[] {
  return rows.filter((row) => !isAnalyticsExcludedSession(row.session_id));
}
