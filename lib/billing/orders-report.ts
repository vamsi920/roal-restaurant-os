import type { Db } from "@/lib/db";
import {
  BILLABLE_PHONE_ORDER_RATE_USD,
  billableReceiptSessionKey,
  isBillablePhoneOrderReceipt,
  type BillableReceiptRow,
} from "@/lib/billing/billable-orders";
import { parseOrderLineItems } from "@/lib/orders/line-items";

/**
 * The order list behind a bill: every completed phone order in a date range, with the per-order
 * fee, so an owner can match their invoice line by line.
 */

type ReceiptRow = BillableReceiptRow & {
  customer_name?: string | null;
  fulfillment_type?: string | null;
  usage_reported_at?: string | null;
};

export type OrderReportRow = {
  placedAt: string;
  location: string;
  orderRef: string;
  customer: string;
  fulfillment: string;
  items: string;
  orderSubtotalUsd: number | null;
  feeUsd: number;
  billed: boolean;
};

export async function loadOrderReport(
  db: Db,
  input: { restaurantIds: string[]; from: Date; to: Date }
): Promise<OrderReportRow[]> {
  if (input.restaurantIds.length === 0) return [];
  const [{ data: restaurants }, { data: receipts, error }] = await Promise.all([
    db.from("restaurants").select("id, name").in("id", input.restaurantIds),
    db
      .from("phone_order_receipts")
      .select("restaurant_id, session_id, items, created_at, customer_name, fulfillment_type, usage_reported_at")
      .in("restaurant_id", input.restaurantIds)
      .gte("created_at", input.from.toISOString())
      .lte("created_at", input.to.toISOString()),
  ]);
  if (error) throw new Error(error.message);
  const names = new Map(((restaurants ?? []) as Array<{ id: string; name: string | null }>).map((r) => [r.id, r.name ?? "Location"]));

  const seen = new Set<string>();
  const rows: OrderReportRow[] = [];
  for (const r of (receipts ?? []) as ReceiptRow[]) {
    if (!isBillablePhoneOrderReceipt(r)) continue;
    const key = billableReceiptSessionKey(r.restaurant_id, r.session_id);
    if (seen.has(key)) continue;
    seen.add(key);
    const lines = parseOrderLineItems(r.items);
    const priced = lines.every((l) => l.unitPrice != null);
    rows.push({
      placedAt: r.created_at,
      location: names.get(r.restaurant_id) ?? "Location",
      orderRef: r.session_id.slice(-8),
      customer: r.customer_name?.trim() || "",
      fulfillment: r.fulfillment_type === "delivery" ? "Delivery" : "Pickup",
      items: lines.map((l) => `${l.quantity}x ${l.name}`).join("; "),
      orderSubtotalUsd: priced ? Math.round(lines.reduce((s, l) => s + (l.unitPrice ?? 0) * l.quantity, 0) * 100) / 100 : null,
      feeUsd: BILLABLE_PHONE_ORDER_RATE_USD,
      billed: Boolean(r.usage_reported_at),
    });
  }
  return rows.sort((a, b) => a.placedAt.localeCompare(b.placedAt));
}

function csvCell(value: string | number | null): string {
  const s = value == null ? "" : String(value);
  // Leading = + - @ would run as formulas in spreadsheet apps.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function orderReportCsv(rows: OrderReportRow[], timeZone = "UTC"): string {
  const fmt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone });
  const header = ["Date", "Location", "Order", "Customer", "Pickup or delivery", "Items", "Order subtotal (before tax)", "ROAL fee", "Sent to bill"];
  const lines = rows.map((r) =>
    [
      fmt.format(new Date(r.placedAt)),
      r.location,
      r.orderRef,
      r.customer,
      r.fulfillment,
      r.items,
      r.orderSubtotalUsd == null ? "" : r.orderSubtotalUsd.toFixed(2),
      r.feeUsd.toFixed(2),
      r.billed ? "Yes" : "Pending",
    ]
      .map(csvCell)
      .join(",")
  );
  const fees = rows.reduce((s, r) => s + r.feeUsd, 0);
  lines.push(["Total", "", `${rows.length} orders`, "", "", "", "", fees.toFixed(2), ""].map(csvCell).join(","));
  return [header.map(csvCell).join(","), ...lines].join("\n") + "\n";
}
