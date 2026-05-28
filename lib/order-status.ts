/** Active kitchen pipeline (post–voice-cart). */
export const PHONE_ORDER_STATUSES = [
  "new",
  "accepted",
  "in_progress",
  "ready",
  "completed",
  "canceled",
] as const;

/** Voice agent in-call cart; not yet finalized. */
export const VOICE_CART_STATUS = "draft" as const;

/** Legacy DB/API value; maps to `new`. */
export const LEGACY_CONFIRMED_STATUS = "confirmed" as const;

export type PhoneOrderStatus = (typeof PHONE_ORDER_STATUSES)[number];
export type VoiceCartStatus = typeof VOICE_CART_STATUS;
export type LegacyOrderStatus = typeof LEGACY_CONFIRMED_STATUS;

export type DraftOrderStatus =
  | PhoneOrderStatus
  | VoiceCartStatus
  | LegacyOrderStatus;

const PHONE_ORDER_STATUS_SET = new Set<string>(PHONE_ORDER_STATUSES);
const ALL_KNOWN_STATUSES = new Set<string>([
  VOICE_CART_STATUS,
  LEGACY_CONFIRMED_STATUS,
  ...PHONE_ORDER_STATUSES,
]);

export const ORDER_STATUS_LABELS: Record<DraftOrderStatus, string> = {
  draft: "Live cart",
  confirmed: "New order",
  new: "New",
  accepted: "Accepted",
  in_progress: "In progress",
  ready: "Ready",
  completed: "Completed",
  canceled: "Canceled",
};

/** Normalize legacy/unknown values for app logic. */
export function normalizeOrderStatus(
  raw: string | null | undefined
): PhoneOrderStatus | VoiceCartStatus {
  if (!raw || raw === LEGACY_CONFIRMED_STATUS) return "new";
  if (raw === VOICE_CART_STATUS) return VOICE_CART_STATUS;
  if (PHONE_ORDER_STATUS_SET.has(raw)) return raw as PhoneOrderStatus;
  return "new";
}

export function isKnownOrderStatus(raw: string): raw is DraftOrderStatus {
  return ALL_KNOWN_STATUSES.has(raw);
}

/** Mid-call cart from sync_draft_order. */
export function isVoiceCartStatus(
  status: string | null | undefined
): boolean {
  return status === VOICE_CART_STATUS;
}

/** Finalized order in kitchen queue (not voice cart, not terminal). */
export function isQueuedKitchenStatus(
  status: string | null | undefined
): boolean {
  const n = normalizeOrderStatus(status);
  return (
    n === "new" ||
    n === "accepted" ||
    n === "in_progress" ||
    n === "ready"
  );
}

export function isTerminalOrderStatus(
  status: string | null | undefined
): boolean {
  const n = normalizeOrderStatus(status);
  return n === "completed" || n === "canceled";
}

/** Statuses allowed on sync_draft_order (in-call updates). */
export function isSyncDraftOrderStatus(
  status: string
): status is VoiceCartStatus | LegacyOrderStatus {
  return status === VOICE_CART_STATUS || status === LEGACY_CONFIRMED_STATUS;
}

/** Coerce sync payload to stored value. */
export function coerceSyncDraftOrderStatus(status: string): string {
  if (status === LEGACY_CONFIRMED_STATUS) return "new";
  return status;
}

/** Status written when finalize_order succeeds. */
export const FINALIZE_ORDER_STATUS: PhoneOrderStatus = "new";

export type OrderAction =
  | "accept"
  | "start"
  | "mark_ready"
  | "complete"
  | "cancel";

export const ORDER_ACTION_TARGET: Record<OrderAction, PhoneOrderStatus> = {
  accept: "accepted",
  start: "in_progress",
  mark_ready: "ready",
  complete: "completed",
  cancel: "canceled",
};

export const ORDER_ACTION_LABELS: Record<OrderAction, string> = {
  accept: "Accept",
  start: "Start",
  mark_ready: "Ready",
  complete: "Complete",
  cancel: "Cancel",
};

const KITCHEN_QUEUE_ORDER: PhoneOrderStatus[] = [
  "new",
  "accepted",
  "in_progress",
  "ready",
];

export function compareKitchenQueue(
  a: string,
  b: string
): number {
  const na = normalizeOrderStatus(a);
  const nb = normalizeOrderStatus(b);
  if (na === VOICE_CART_STATUS || nb === VOICE_CART_STATUS) return 0;
  const ia = KITCHEN_QUEUE_ORDER.indexOf(na);
  const ib = KITCHEN_QUEUE_ORDER.indexOf(nb);
  return ia - ib;
}

export function getOrderActionsForStatus(
  status: string | null | undefined
): OrderAction[] {
  const n = normalizeOrderStatus(status);
  switch (n) {
    case "new":
      return ["accept", "cancel"];
    case "accepted":
      return ["start", "cancel"];
    case "in_progress":
      return ["mark_ready", "cancel"];
    case "ready":
      return ["complete", "cancel"];
    default:
      return [];
  }
}

export function canApplyOrderAction(
  currentStatus: string | null | undefined,
  action: OrderAction
): boolean {
  return getOrderActionsForStatus(currentStatus).includes(action);
}

export function statusTimestampField(
  status: PhoneOrderStatus
): keyof OrderStatusTimestamps | null {
  switch (status) {
    case "accepted":
      return "accepted_at";
    case "in_progress":
      return "in_progress_at";
    case "ready":
      return "ready_at";
    case "completed":
      return "completed_at";
    case "canceled":
      return "canceled_at";
    default:
      return null;
  }
}

export type OrderStatusTimestamps = {
  accepted_at: string | null;
  in_progress_at: string | null;
  ready_at: string | null;
  completed_at: string | null;
  canceled_at: string | null;
};

export const STATUS_BADGE_CLASS: Record<
  PhoneOrderStatus | VoiceCartStatus,
  string
> = {
  draft: "bg-warning/20 text-amber-900",
  new: "bg-accent-soft text-accent",
  accepted: "bg-accent/15 text-accent",
  in_progress: "bg-warning/15 text-amber-900",
  ready: "bg-success/15 text-emerald-900",
  completed: "bg-success/20 text-emerald-900",
  canceled: "bg-subtle/20 text-muted line-through",
};
