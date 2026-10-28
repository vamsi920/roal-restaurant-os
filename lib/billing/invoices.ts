import type { StripeClient } from "@/lib/billing/stripe";

/**
 * Owner-facing invoice history and the running bill for the current month, read straight from
 * the payment account so the dashboard always matches what the restaurant is charged.
 */

export type InvoiceSummary = {
  id: string;
  number: string | null;
  issuedAt: string;
  periodStart: string | null;
  periodEnd: string | null;
  /** Completed orders billed on this invoice (the metered quantity). */
  orders: number;
  status: "paid" | "open" | "void" | "uncollectible" | "draft";
  subtotalUsd: number;
  taxUsd: number;
  totalUsd: number;
  amountDueUsd: number;
  viewUrl: string | null;
  pdfUrl: string | null;
};

export type UpcomingBill = {
  orders: number;
  subtotalUsd: number;
  taxUsd: number;
  totalUsd: number;
  /** True when the payment account calculated sales tax for this bill. */
  taxCalculated: boolean;
  billsOn: string | null;
};

type Obj = Record<string, unknown>;

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const iso = (sec: unknown): string | null => (num(sec) != null ? new Date((sec as number) * 1000).toISOString() : null);
const usd = (cents: number | null): number => Math.round(cents ?? 0) / 100;

function invoiceLines(inv: Obj): Obj[] {
  return ((inv.lines as { data?: Obj[] } | undefined)?.data ?? []).filter(Boolean);
}

/** Tax on an invoice: newer API versions drop `tax` in favor of `total_taxes`. */
function taxCents(inv: Obj): number {
  const direct = num(inv.tax);
  if (direct != null) return direct;
  const list = inv.total_taxes as Array<{ amount?: number }> | undefined;
  if (Array.isArray(list)) return list.reduce((sum, t) => sum + (num(t.amount) ?? 0), 0);
  const total = num(inv.total);
  const excl = num(inv.total_excluding_tax);
  return total != null && excl != null ? Math.max(0, total - excl) : 0;
}

function hasCalculatedTax(inv: Obj): boolean {
  const auto = inv.automatic_tax as { enabled?: boolean; status?: string } | undefined;
  return Boolean(auto?.enabled && auto.status === "complete");
}

function orderCount(inv: Obj): number {
  return invoiceLines(inv).reduce((sum, line) => sum + (num(line.quantity) ?? 0), 0);
}

function linePeriod(inv: Obj): { start: string | null; end: string | null } {
  const period = invoiceLines(inv)[0]?.period as { start?: number; end?: number } | undefined;
  return {
    start: iso(period?.start ?? inv.period_start),
    end: iso(period?.end ?? inv.period_end),
  };
}

export function toInvoiceSummary(inv: Obj): InvoiceSummary {
  const period = linePeriod(inv);
  const status = String(inv.status ?? "open") as InvoiceSummary["status"];
  return {
    id: String(inv.id),
    number: typeof inv.number === "string" ? inv.number : null,
    issuedAt: iso(inv.status_transitions && (inv.status_transitions as Obj).finalized_at) ?? iso(inv.created) ?? new Date(0).toISOString(),
    periodStart: period.start,
    periodEnd: period.end,
    orders: orderCount(inv),
    status,
    subtotalUsd: usd(num(inv.subtotal)),
    taxUsd: usd(taxCents(inv)),
    totalUsd: usd(num(inv.total)),
    amountDueUsd: usd(num(inv.amount_due)),
    viewUrl: typeof inv.hosted_invoice_url === "string" ? inv.hosted_invoice_url : null,
    pdfUrl: typeof inv.invoice_pdf === "string" ? inv.invoice_pdf : null,
  };
}

/** Finalized invoices, newest first. Drafts stay hidden until they're final. */
export async function listCustomerInvoices(stripe: StripeClient, customerId: string, limit = 12): Promise<InvoiceSummary[]> {
  const res = await stripe.get<{ data?: Obj[] }>("/invoices", { customer: customerId, limit });
  return (res.data ?? []).filter((inv) => inv.status !== "draft").map(toInvoiceSummary);
}

/** What the next monthly bill looks like so far, including sales tax when it applies. */
export async function previewUpcomingBill(
  stripe: StripeClient,
  input: { customerId: string; subscriptionId: string | null }
): Promise<UpcomingBill | null> {
  try {
    const inv = await stripe.post<Obj>("/invoices/create_preview", {
      customer: input.customerId,
      subscription: input.subscriptionId ?? undefined,
    });
    return {
      orders: orderCount(inv),
      subtotalUsd: usd(num(inv.subtotal)),
      taxUsd: usd(taxCents(inv)),
      totalUsd: usd(num(inv.total)),
      taxCalculated: hasCalculatedTax(inv),
      billsOn: iso(inv.next_payment_attempt) ?? linePeriod(inv).end,
    };
  } catch (e) {
    console.warn("[billing] upcoming bill", e instanceof Error ? e.message : e);
    return null;
  }
}

export type OrganizationInvoices = { invoices: InvoiceSummary[]; upcoming: UpcomingBill | null; failed: boolean };

export async function loadOrganizationInvoices(
  stripe: StripeClient | null,
  org: { stripe_customer_id: string | null; stripe_subscription_id: string | null }
): Promise<OrganizationInvoices> {
  const customerId = org.stripe_customer_id?.trim();
  if (!stripe || !customerId) return { invoices: [], upcoming: null, failed: false };
  try {
    const [invoices, upcoming] = await Promise.all([
      listCustomerInvoices(stripe, customerId),
      org.stripe_subscription_id?.trim()
        ? previewUpcomingBill(stripe, { customerId, subscriptionId: org.stripe_subscription_id.trim() })
        : Promise.resolve(null),
    ]);
    return { invoices, upcoming, failed: false };
  } catch (e) {
    console.error("[billing] invoices", e instanceof Error ? e.message : e);
    return { invoices: [], upcoming: null, failed: true };
  }
}
