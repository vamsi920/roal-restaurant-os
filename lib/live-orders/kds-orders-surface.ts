import type { CommandCenterCallRow } from "@/lib/command-center/types";
import { classifyKdsQueueLane } from "@/lib/orders/kds-queue-lane";
import { isVoiceCartStatus, normalizeOrderStatus } from "@/lib/order-status";
import type { DraftOrderRow, PhoneOrderReceiptRow } from "@/lib/types";
import type { LiveOrdersRecentOutcome } from "@/lib/live-orders/build-recent-outcomes";

/** Copy that must not appear on owner KDS / live-orders surfaces. */
export const KDS_EXCLUDED_UI_PHRASES = [
  "staff management",
  "admin ops",
  "manage staff",
  "employee schedule",
  "hr ",
] as const;

export function kdsSurfaceExcludesStaffManagementCopy(text: string): boolean {
  const blob = text.toLowerCase();
  return !KDS_EXCLUDED_UI_PHRASES.some((phrase) => blob.includes(phrase));
}

export function filterDraftOrdersForRestaurant(
  rows: DraftOrderRow[],
  restaurantId: string
): DraftOrderRow[] {
  const rid = restaurantId.trim();
  if (!rid) return [];
  return rows.filter((row) => row.restaurant_id === rid);
}

export function filterReceiptsForRestaurant(
  rows: PhoneOrderReceiptRow[],
  restaurantId: string
): PhoneOrderReceiptRow[] {
  const rid = restaurantId.trim();
  if (!rid) return [];
  return rows.filter((row) => row.restaurant_id === rid);
}

export function kdsActiveDraftOrders(rows: DraftOrderRow[]): DraftOrderRow[] {
  return rows.filter((row) => isVoiceCartStatus(row.status));
}

export function kdsConfirmedTicketOrders(rows: DraftOrderRow[]): DraftOrderRow[] {
  return rows.filter((row) => normalizeOrderStatus(row.status) === "new");
}

export function liveCallIndicatorCounts(input: {
  liveCarts: DraftOrderRow[];
  activeCalls: CommandCenterCallRow[];
}): { liveCount: number; supplementalCalls: number } {
  const liveCartSessions = new Set(
    kdsActiveDraftOrders(input.liveCarts).map((row) => row.session_id)
  );
  const supplementalCalls = input.activeCalls.filter(
    (call) => !liveCartSessions.has(call.sessionId)
  ).length;
  return {
    liveCount: liveCartSessions.size + supplementalCalls,
    supplementalCalls,
  };
}

export function shouldShowLiveCallIndicator(input: {
  liveCarts: DraftOrderRow[];
  activeCalls: CommandCenterCallRow[];
}): boolean {
  return liveCallIndicatorCounts(input).liveCount > 0;
}

export function kdsHasPhoneOrderActivity(input: {
  drafts: DraftOrderRow[];
  receipts: PhoneOrderReceiptRow[];
}): boolean {
  return input.drafts.length > 0 || input.receipts.length > 0;
}

export function kdsHonestEmptyOrdersCopy(): {
  title: string;
  body: string;
} {
  return {
    title: "No phone orders yet",
    body: "Live orders fills when a guest calls and places an order.",
  };
}

export function recentOutcomeShowsNoOrderCall(
  outcomes: LiveOrdersRecentOutcome[]
): boolean {
  return outcomes.some(
    (row) => row.kind === "unknown" || row.kind === "failed" || row.kind === "voicemail"
  );
}

export function draftShowsOnPhoneQueue(order: DraftOrderRow): boolean {
  if (isVoiceCartStatus(order.status)) {
    const lane = classifyKdsQueueLane(order);
    return lane === "live_call" || lane === "building";
  }
  return normalizeOrderStatus(order.status) === "new";
}
