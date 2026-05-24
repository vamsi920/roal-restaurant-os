import { ORDER_STATUS_LABELS, normalizeOrderStatus } from "@/lib/order-status";
import type { DraftOrderRow } from "@/lib/types";

export type StatusHistoryEntry = {
  label: string;
  at: string;
  iso: string;
};

function formatHistoryTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function buildOrderStatusHistory(
  order: DraftOrderRow
): StatusHistoryEntry[] {
  const entries: StatusHistoryEntry[] = [];

  if (order.created_at) {
    entries.push({
      label: "Order placed",
      iso: order.created_at,
      at: formatHistoryTime(order.created_at),
    });
  }

  const steps: {
    key: keyof Pick<
      DraftOrderRow,
      | "accepted_at"
      | "in_progress_at"
      | "ready_at"
      | "completed_at"
      | "canceled_at"
    >;
    label: string;
  }[] = [
    { key: "accepted_at", label: ORDER_STATUS_LABELS.accepted },
    { key: "in_progress_at", label: ORDER_STATUS_LABELS.in_progress },
    { key: "ready_at", label: ORDER_STATUS_LABELS.ready },
    { key: "completed_at", label: ORDER_STATUS_LABELS.completed },
    { key: "canceled_at", label: ORDER_STATUS_LABELS.canceled },
  ];

  for (const step of steps) {
    const iso = order[step.key];
    if (iso) {
      entries.push({
        label: step.label,
        iso,
        at: formatHistoryTime(iso),
      });
    }
  }

  const status = normalizeOrderStatus(order.status);
  if (
    status === "new" &&
    !order.accepted_at &&
    order.updated_at &&
    order.updated_at !== order.created_at
  ) {
    entries.push({
      label: ORDER_STATUS_LABELS.new,
      iso: order.updated_at,
      at: formatHistoryTime(order.updated_at),
    });
  }

  return entries.sort(
    (a, b) => new Date(a.iso).getTime() - new Date(b.iso).getTime()
  );
}

export function buildReceiptStatusHistory(
  createdAt: string
): StatusHistoryEntry[] {
  return [
    {
      label: "Finalized",
      iso: createdAt,
      at: formatHistoryTime(createdAt),
    },
  ];
}
