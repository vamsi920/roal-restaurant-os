import { describe, expect, it, vi } from "vitest";
import { createMemoryDb } from "@/lib/db";
import { createStripeClient } from "@/lib/billing/stripe";
import { listCustomerInvoices, loadOrganizationInvoices, previewUpcomingBill, toInvoiceSummary } from "@/lib/billing/invoices";
import { loadOrderReport, orderReportCsv } from "@/lib/billing/orders-report";

function fakeStripe(responses: Record<string, unknown>) {
  const calls: string[] = [];
  const fn = vi.fn(async (url: string, init?: RequestInit) => {
    const u = new URL(url);
    const key = `${init?.method ?? "GET"} ${u.pathname.replace(/^\/v1/, "")}`;
    calls.push(`${key}${u.search}`);
    if (key in responses) return new Response(JSON.stringify(responses[key]), { status: 200 });
    return new Response(JSON.stringify({ error: { message: "nope" } }), { status: 400 });
  });
  return { stripe: createStripeClient("sk_test_x", fn as never), calls };
}

const paidInvoice = {
  id: "in_1",
  number: "ROAL-0001",
  status: "paid",
  created: 1_790_000_000,
  subtotal: 2700,
  total: 2923,
  total_excluding_tax: 2700,
  total_taxes: [{ amount: 223 }],
  amount_due: 2923,
  hosted_invoice_url: "https://invoice.example/in_1",
  invoice_pdf: "https://invoice.example/in_1.pdf",
  lines: { data: [{ quantity: 30, period: { start: 1_787_400_000, end: 1_790_000_000 } }] },
};

describe("invoice summaries", () => {
  it("reads orders, tax and totals from an invoice", () => {
    const s = toInvoiceSummary(paidInvoice);
    expect(s).toMatchObject({ number: "ROAL-0001", orders: 30, subtotalUsd: 27, taxUsd: 2.23, totalUsd: 29.23, status: "paid" });
    expect(s.periodStart).toBe(new Date(1_787_400_000 * 1000).toISOString());
    expect(s.pdfUrl).toContain(".pdf");
  });

  it("falls back to total minus pre-tax total when no tax breakdown is given", () => {
    const s = toInvoiceSummary({ ...paidInvoice, total_taxes: undefined, tax: undefined });
    expect(s.taxUsd).toBe(2.23);
  });

  it("hides drafts from the invoice list", async () => {
    const { stripe } = fakeStripe({ "GET /invoices": { data: [paidInvoice, { ...paidInvoice, id: "in_2", status: "draft" }] } });
    const list = await listCustomerInvoices(stripe, "cus_1");
    expect(list.map((i) => i.id)).toEqual(["in_1"]);
  });

  it("previews the running bill with tax status", async () => {
    const { stripe } = fakeStripe({
      "POST /invoices/create_preview": {
        ...paidInvoice,
        status: "draft",
        automatic_tax: { enabled: true, status: "complete" },
        next_payment_attempt: 1_792_600_000,
      },
    });
    const bill = await previewUpcomingBill(stripe, { customerId: "cus_1", subscriptionId: "sub_1" });
    expect(bill).toMatchObject({ orders: 30, subtotalUsd: 27, taxUsd: 2.23, totalUsd: 29.23, taxCalculated: true });
  });

  it("shows nothing (and no error) before a plan exists", async () => {
    const { stripe, calls } = fakeStripe({});
    expect(await loadOrganizationInvoices(stripe, { stripe_customer_id: null, stripe_subscription_id: null })).toEqual({
      invoices: [],
      upcoming: null,
      failed: false,
    });
    expect(calls).toHaveLength(0);
  });

  it("reports a load failure instead of throwing", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { stripe } = fakeStripe({});
    const res = await loadOrganizationInvoices(stripe, { stripe_customer_id: "cus_1", stripe_subscription_id: null });
    expect(res.failed).toBe(true);
  });
});

describe("order report", () => {
  it("lists billable orders in range with fee and billed state", async () => {
    const db = createMemoryDb();
    const { data: r } = await db.from("restaurants").insert({ name: "Joe's Pizza" }).select("id").single();
    const rid = r!.id as string;
    await db.from("phone_order_receipts").insert({
      restaurant_id: rid,
      session_id: "conv_abcdef123456",
      items: [{ name: "Pepperoni", quantity: 2, unit_price: 12.5 }],
      customer_name: "=Sam",
      fulfillment_type: "pickup",
      created_at: "2026-10-05T18:00:00Z",
      usage_reported_at: "2026-10-05T18:00:02Z",
    });
    await db.from("phone_order_receipts").insert({
      restaurant_id: rid,
      session_id: "roal-harness-1",
      items: [{ name: "Test", quantity: 1, unit_price: 1 }],
      created_at: "2026-10-06T18:00:00Z",
    });
    await db.from("phone_order_receipts").insert({
      restaurant_id: rid,
      session_id: "conv_out_of_range",
      items: [{ name: "Pepperoni", quantity: 1, unit_price: 12.5 }],
      created_at: "2026-11-05T18:00:00Z",
    });

    const rows = await loadOrderReport(db, {
      restaurantIds: [rid],
      from: new Date("2026-10-01T00:00:00Z"),
      to: new Date("2026-10-31T23:59:59Z"),
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ location: "Joe's Pizza", items: "2x Pepperoni", orderSubtotalUsd: 25, feeUsd: 0.9, billed: true });

    const csv = orderReportCsv(rows, "America/New_York");
    const lines = csv.trim().split("\n");
    expect(lines[0]).toContain("ROAL fee");
    expect(lines[1]).toContain("'=Sam");
    expect(lines[1]).toContain("25.00,0.90,Yes");
    expect(lines.at(-1)).toContain("1 orders");
  });
});
