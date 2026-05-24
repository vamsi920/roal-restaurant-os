import {
  canApplyOrderAction,
  ORDER_ACTION_TARGET,
  statusTimestampField,
  type OrderAction,
} from "@/lib/order-status";
import type { DraftOrderRow } from "@/lib/types";

export function buildOrderStatusPatch(
  order: DraftOrderRow,
  action: OrderAction
): { ok: true; patch: Record<string, unknown> } | { ok: false; error: string } {
  if (!canApplyOrderAction(order.status, action)) {
    return {
      ok: false,
      error: `Cannot ${action} from status "${order.status}"`,
    };
  }

  const nextStatus = ORDER_ACTION_TARGET[action];
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    status: nextStatus,
    updated_at: now,
  };

  const field = statusTimestampField(nextStatus);
  if (field && !order[field]) {
    patch[field] = now;
  }

  return { ok: true, patch };
}

export function applyOrderStatusLocally(
  order: DraftOrderRow,
  action: OrderAction
): DraftOrderRow | null {
  const built = buildOrderStatusPatch(order, action);
  if (!built.ok) return null;
  return { ...order, ...built.patch } as DraftOrderRow;
}

export function isExpectedStatusAfterAction(
  action: OrderAction,
  status: string
): boolean {
  return ORDER_ACTION_TARGET[action] === status;
}
