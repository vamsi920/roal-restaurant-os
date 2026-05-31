import {
  isVoiceCartStatus,
  normalizeOrderStatus,
} from "./order-status.ts";

type OrderTimelineRow = {
  status?: string | null;
  items?: unknown;
  created_at?: string | null;
  updated_at?: string | null;
  accepted_at?: string | null;
  in_progress_at?: string | null;
  ready_at?: string | null;
  completed_at?: string | null;
  canceled_at?: string | null;
  fulfillment_type?: string | null;
};

export type CallerStatusTimelineEntry = {
  label: string;
  description: string;
};

function lineCount(items: unknown): number {
  if (!Array.isArray(items)) return 0;
  return items.reduce((sum, item) => {
    const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    const quantity = Number(row.quantity ?? 1);
    return sum + (Number.isFinite(quantity) && quantity > 0 ? quantity : 1);
  }, 0);
}

export function buildCallerOrderStatusTimeline(
  order: OrderTimelineRow
): CallerStatusTimelineEntry[] {
  const entries: CallerStatusTimelineEntry[] = [];
  const count = lineCount(order.items);

  if (order.created_at) {
    entries.push({
      label: "Call received",
      description: "ROAL opened a live phone cart for this guest.",
    });
  }

  const status = normalizeOrderStatus(order.status ?? null);
  if (isVoiceCartStatus(status)) {
    entries.push({
      label: count > 0 ? "Guest is building an order" : "Guest is on the line",
      description:
        count > 0
          ? `${count} item${count === 1 ? "" : "s"} captured so far. The ticket is not finalized yet.`
          : "The call is active; items may appear as the guest orders.",
    });
    return entries;
  }

  const finalizedAt =
    order.updated_at && !order.accepted_at && !order.canceled_at
      ? order.updated_at
      : null;
  if (finalizedAt && (status === "new" || status === "completed")) {
    entries.push({
      label: "Ticket sent to kitchen",
      description: "The guest confirmed the order and ROAL sent it to the queue.",
    });
  }

  const steps: {
    key: keyof Pick<
      OrderTimelineRow,
      | "accepted_at"
      | "in_progress_at"
      | "ready_at"
      | "completed_at"
      | "canceled_at"
    >;
    label: string;
    description: string;
  }[] = [
    {
      key: "accepted_at",
      label: "Kitchen accepted",
      description: "Staff acknowledged the confirmed ticket.",
    },
    {
      key: "in_progress_at",
      label: "Preparing order",
      description: "The kitchen marked this order in progress.",
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
    },
    {
      key: "completed_at",
      label: "Order completed",
      description:
        order.fulfillment_type === "delivery"
          ? "The delivery order was completed."
          : "The pickup order was completed.",
    },
    {
      key: "canceled_at",
      label: "Order canceled",
      description: "Staff canceled the ticket from the queue.",
    },
  ];

  for (const step of steps) {
    if (order[step.key]) {
      entries.push({ label: step.label, description: step.description });
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
      description: "The ticket is waiting for the kitchen to accept it.",
    });
  }

  return entries;
}
