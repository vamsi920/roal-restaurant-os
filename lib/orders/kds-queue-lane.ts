import { parseOrderLineItems } from "@/lib/orders/line-items";
import {
  isQueuedKitchenStatus,
  isTerminalOrderStatus,
  isVoiceCartStatus,
  normalizeOrderStatus,
} from "@/lib/order-status";
import type { DraftOrderRow } from "@/lib/types";

/** Default UI threshold; org notification settings may differ. */
export const KDS_STUCK_THRESHOLD_MINUTES = 20;

export type KdsQueueLane =
  | "live_call"
  | "building"
  | "new_ticket"
  | "accepted"
  | "in_progress"
  | "ready"
  | "terminal";

export const KDS_LANE_LABEL: Record<KdsQueueLane, string> = {
  live_call: "On the phone",
  building: "Building order",
  new_ticket: "Confirmed",
  accepted: "Accepted",
  in_progress: "Cooking",
  ready: "Ready for pickup",
  terminal: "Done",
};

type LaneOrder = Pick<DraftOrderRow, "status" | "items">;

export function classifyKdsQueueLane(order: LaneOrder): KdsQueueLane {
  if (isVoiceCartStatus(order.status)) {
    const hasItems = parseOrderLineItems(order.items).length > 0;
    return hasItems ? "building" : "live_call";
  }
  const status = normalizeOrderStatus(order.status);
  if (status === "new") return "new_ticket";
  if (status === "accepted") return "accepted";
  if (status === "in_progress") return "in_progress";
  if (status === "ready") return "ready";
  return "terminal";
}

export function kdsLaneLabel(order: LaneOrder): string {
  return KDS_LANE_LABEL[classifyKdsQueueLane(order)];
}

export function minutesSinceUpdated(
  updatedAt: string,
  now: Date = new Date()
): number {
  const ms = now.getTime() - new Date(updatedAt).getTime();
  if (Number.isNaN(ms) || ms < 0) return 0;
  return Math.floor(ms / 60_000);
}

export function isKdsStuckOrder(
  order: Pick<DraftOrderRow, "status" | "updated_at">,
  options?: { now?: Date; thresholdMinutes?: number }
): boolean {
  const now = options?.now ?? new Date();
  const threshold = options?.thresholdMinutes ?? KDS_STUCK_THRESHOLD_MINUTES;
  if (isTerminalOrderStatus(order.status)) return false;
  if (
    !isQueuedKitchenStatus(order.status) &&
    !isVoiceCartStatus(order.status)
  ) {
    return false;
  }
  return minutesSinceUpdated(order.updated_at, now) >= threshold;
}

export function formatStuckIdleLabel(minutes: number): string {
  if (minutes < 60) return `Stuck · ${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `Stuck · ${h}h ${m}m` : `Stuck · ${h}h`;
}
