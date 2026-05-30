import { lineCountFromItems } from "@/lib/agent-calls/classify-outcome";
import type {
  AgentCallOutcome,
  AgentCallSession,
  DraftOrderCallRow,
  ReceiptCallRow,
} from "@/lib/agent-calls/types";
import type {
  CallHistoryOutcomeFilter,
  CallHistoryRow,
} from "@/lib/call-history/types";
import { computeOrderTotals } from "@/lib/orders/compute-order-totals";
import { parseOrderLineItems } from "@/lib/orders/line-items";
import type { MenuPriceContext } from "@/lib/orders/menu-price-context";
import { formatMoney } from "@/lib/orders/money";
import type { OrderPricingSettings } from "@/lib/orders/pricing-settings";
import { DEFAULT_ORDER_PRICING } from "@/lib/orders/pricing-settings";

const OUTCOME_LABEL: Record<AgentCallOutcome, string> = {
  in_progress: "In progress",
  order_completed: "Order completed",
  abandoned: "Abandoned",
  canceled: "Canceled",
  no_order: "No order",
  unknown: "Unknown",
};

function indexBySession<T extends { session_id: string }>(
  rows: T[]
): Map<string, T> {
  const map = new Map<string, T>();
  for (const row of rows) {
    map.set(row.session_id, row);
  }
  return map;
}

export function formatCallHistoryTotal(
  items: unknown,
  menuCtx: MenuPriceContext | null,
  pricing: OrderPricingSettings = DEFAULT_ORDER_PRICING
): string | null {
  const lines = parseOrderLineItems(items);
  if (lines.length === 0) return null;
  if (!menuCtx) return null;

  const totals = computeOrderTotals(lines, menuCtx, pricing);
  if (totals.complete && totals.total != null) {
    return formatMoney(totals.total);
  }
  if (totals.subtotal != null) {
    return `${formatMoney(totals.subtotal)}+`;
  }
  return null;
}

export function buildCallHistoryRows(input: {
  sessions: AgentCallSession[];
  drafts: DraftOrderCallRow[];
  receipts: ReceiptCallRow[];
  menuCtx?: MenuPriceContext | null;
  pricing?: OrderPricingSettings;
  limit?: number;
}): CallHistoryRow[] {
  const drafts = indexBySession(input.drafts);
  const receipts = indexBySession(input.receipts);
  const pricing = input.pricing ?? DEFAULT_ORDER_PRICING;
  const limit = input.limit ?? 100;

  const rows: CallHistoryRow[] = input.sessions.map((session) => {
    const draft = drafts.get(session.sessionId) ?? null;
    const receipt = receipts.get(session.sessionId) ?? null;
    const items = receipt?.items ?? draft?.items ?? [];
    const lineCount = lineCountFromItems(items);
    const totalLabel = input.menuCtx
      ? formatCallHistoryTotal(items, input.menuCtx, pricing)
      : null;

    const callerName =
      draft?.customer_name?.trim() || receipt?.customer_name?.trim() || null;
    const callerPhone =
      session.callerPhone?.trim() ||
      draft?.customer_phone?.trim() ||
      receipt?.customer_phone?.trim() ||
      null;

    const occurredAt = session.endedAt ?? session.startedAt;

    return {
      sessionId: session.sessionId,
      callerPhone,
      callerName,
      outcome: session.outcome,
      status: session.status,
      outcomeLabel: OUTCOME_LABEL[session.outcome],
      lineCount,
      totalLabel,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      occurredAt,
      source: session.source,
    };
  });

  rows.sort(
    (a, b) =>
      new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
  );

  return rows.slice(0, limit);
}

export function filterCallHistoryRows(
  rows: CallHistoryRow[],
  filter: CallHistoryOutcomeFilter
): CallHistoryRow[] {
  if (filter === "all") return rows;
  return rows.filter((row) => {
    switch (filter) {
      case "completed":
        return row.outcome === "order_completed";
      case "active":
        return row.outcome === "in_progress" || row.status === "active";
      case "failed":
        return row.outcome === "canceled" || row.outcome === "abandoned";
      case "other":
        return (
          row.outcome !== "order_completed" &&
          row.outcome !== "in_progress" &&
          row.status !== "active" &&
          row.outcome !== "canceled" &&
          row.outcome !== "abandoned"
        );
      default:
        return true;
    }
  });
}
