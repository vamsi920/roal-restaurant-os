import { parseOrderLineItems } from "@/lib/orders/line-items";

/** Per-order pilot rate shown in authenticated billing. */
export const BILLABLE_PHONE_ORDER_RATE_USD = 0.90;

/** Voice-agent test harness sessions are never billable. */
export const TEST_HARNESS_SESSION_PREFIX = "roal-harness-";

export type BillableReceiptRow = {
  restaurant_id: string;
  session_id: string;
  items: unknown;
  created_at: string;
};

export function isTestHarnessBillingSession(
  sessionId: string | null | undefined
): boolean {
  const trimmed = sessionId?.trim();
  if (!trimmed) return false;
  return trimmed.startsWith(TEST_HARNESS_SESSION_PREFIX);
}

export function billableReceiptSessionKey(
  restaurantId: string,
  sessionId: string
): string {
  return `${restaurantId}:${sessionId.trim()}`;
}

export function isBillablePhoneOrderReceipt(row: BillableReceiptRow): boolean {
  if (!row.restaurant_id?.trim()) return false;
  const sessionId = row.session_id?.trim();
  if (!sessionId) return false;
  if (isTestHarnessBillingSession(sessionId)) return false;
  return parseOrderLineItems(row.items).length > 0;
}

export function filterBillablePhoneOrderReceipts(
  rows: BillableReceiptRow[]
): BillableReceiptRow[] {
  const seen = new Set<string>();
  const billable: BillableReceiptRow[] = [];
  for (const row of rows) {
    if (!isBillablePhoneOrderReceipt(row)) continue;
    const key = billableReceiptSessionKey(row.restaurant_id, row.session_id);
    if (seen.has(key)) continue;
    seen.add(key);
    billable.push(row);
  }
  return billable;
}

export function countBillablePhoneOrders(rows: BillableReceiptRow[]): number {
  return filterBillablePhoneOrderReceipts(rows).length;
}

export function estimateBillablePhoneOrderChargeUsd(count: number): number {
  return Math.round(count * BILLABLE_PHONE_ORDER_RATE_USD * 100) / 100;
}

/** Usage `order_completed` without a matching receipt is not billable. */
export function isTranscriptOnlyOrderCompletion(
  restaurantId: string,
  sessionId: string,
  receiptSessionKeys: ReadonlySet<string>
): boolean {
  const key = billableReceiptSessionKey(restaurantId, sessionId);
  return !receiptSessionKeys.has(key);
}

export function buildBillableReceiptSessionKeys(
  rows: BillableReceiptRow[]
): Set<string> {
  const keys = new Set<string>();
  for (const row of filterBillablePhoneOrderReceipts(rows)) {
    keys.add(billableReceiptSessionKey(row.restaurant_id, row.session_id));
  }
  return keys;
}
