import {
  isVoiceCartStatus,
  normalizeOrderStatus,
} from "@/lib/order-status";
import { parseOrderLineItems } from "@/lib/orders/line-items";
import type { DraftOrderRow, PhoneOrderReceiptRow } from "@/lib/types";

export type StatusHistoryEntry = {
  label: string;
  at: string;
  iso: string;
  description: string;
  tone: "call" | "ticket" | "kitchen" | "done" | "danger";
};

/** Caller-safe milestones for get_order_status (no timestamps or internal tones). */
export type CallerStatusTimelineEntry = {
  label: string;
  description: string;
};

export function buildCallerOrderStatusTimeline(
  order: DraftOrderRow
): CallerStatusTimelineEntry[] {
  return buildOrderStatusHistory(order).map(({ label, description }) => ({
    label,
    description,
  }));
}

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
  const lineCount = parseOrderLineItems(order.items).reduce(
    (sum, line) => sum + Math.max(1, line.quantity),
    0
  );

  if (order.created_at) {
    entries.push({
      label: "Call received",
      iso: order.created_at,
      at: formatHistoryTime(order.created_at),
      description: "ROAL opened a live phone cart for this guest.",
      tone: "call",
    });
  }

  const status = normalizeOrderStatus(order.status);
  if (isVoiceCartStatus(status)) {
    entries.push({
      label: lineCount > 0 ? "Guest is building an order" : "Guest is on the line",
      iso: order.updated_at || order.created_at,
      at: formatHistoryTime(order.updated_at || order.created_at),
      description:
        lineCount > 0
          ? `${lineCount} item${lineCount === 1 ? "" : "s"} captured so far. The ticket is not finalized yet.`
          : "The call is active; items may appear as the guest orders.",
      tone: "call",
    });
    return dedupeAndSort(entries);
  }

  const finalizedAt =
    order.updated_at && !order.accepted_at && !order.canceled_at
      ? order.updated_at
      : null;
  if (finalizedAt && (status === "new" || status === "completed")) {
    entries.push({
      label: "Ticket sent to kitchen",
      iso: finalizedAt,
      at: formatHistoryTime(finalizedAt),
      description: "The guest confirmed the order and ROAL sent it to the queue.",
      tone: "ticket",
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
    description: string;
    tone: StatusHistoryEntry["tone"];
  }[] = [
    {
      key: "accepted_at",
      label: "Kitchen accepted",
      description: "Staff acknowledged the confirmed ticket.",
      tone: "kitchen",
    },
    {
      key: "in_progress_at",
      label: "Preparing order",
      description: "The kitchen marked this order in progress.",
      tone: "kitchen",
    },
    {
      key: "ready_at",
      label:
        order.fulfillment_type === "delivery"
          ? "Ready for delivery"
          : "Ready for pickup",
      description:
        order.fulfillment_type === "delivery"
          ? "The order is ready for handoff to delivery."
          : "The order is ready for the guest.",
      tone: "kitchen",
    },
    {
      key: "completed_at",
      label: "Order completed",
      description:
        order.fulfillment_type === "delivery"
          ? "The delivery order was completed."
          : "The pickup order was completed.",
      tone: "done",
    },
    {
      key: "canceled_at",
      label: "Order canceled",
      description: "Staff canceled the ticket from the queue.",
      tone: "danger",
    },
  ];

  for (const step of steps) {
    const iso = order[step.key];
    if (iso) {
      entries.push({
        label: step.label,
        iso,
        at: formatHistoryTime(iso),
        description: step.description,
        tone: step.tone,
      });
    }
  }

  if (
    status === "new" &&
    !order.accepted_at &&
    order.updated_at &&
    order.updated_at !== order.created_at
  ) {
    entries.push({
      label: "New order",
      iso: order.updated_at,
      at: formatHistoryTime(order.updated_at),
      description: "The ticket is waiting for the kitchen to accept it.",
      tone: "ticket",
    });
  }

  return dedupeAndSort(entries);
}

export function buildReceiptStatusHistory(
  receiptOrCreatedAt: string | PhoneOrderReceiptRow
): StatusHistoryEntry[] {
  const createdAt =
    typeof receiptOrCreatedAt === "string"
      ? receiptOrCreatedAt
      : receiptOrCreatedAt.created_at;
  return [
    {
      label: "Phone order finalized",
      iso: createdAt,
      at: formatHistoryTime(createdAt),
      description:
        "ROAL confirmed the guest's order and stored the receipt for this session.",
      tone: "done",
    },
  ];
}

function dedupeAndSort(entries: StatusHistoryEntry[]): StatusHistoryEntry[] {
  const seen = new Set<string>();
  const out: StatusHistoryEntry[] = [];
  for (const entry of entries) {
    const key = `${entry.iso}:${entry.label}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(entry);
  }
  return out.sort(
    (a, b) => new Date(a.iso).getTime() - new Date(b.iso).getTime()
  );
}
