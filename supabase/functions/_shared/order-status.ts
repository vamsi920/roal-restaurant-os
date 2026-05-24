export const PHONE_ORDER_STATUSES = [
  "new",
  "accepted",
  "in_progress",
  "ready",
  "completed",
  "canceled",
] as const;

export const VOICE_CART_STATUS = "draft" as const;
export const LEGACY_CONFIRMED_STATUS = "confirmed" as const;

export type PhoneOrderStatus = (typeof PHONE_ORDER_STATUSES)[number];

const PHONE_ORDER_STATUS_SET = new Set<string>(PHONE_ORDER_STATUSES);

export function normalizeOrderStatus(
  raw: string | null | undefined
): PhoneOrderStatus | typeof VOICE_CART_STATUS {
  if (!raw || raw === LEGACY_CONFIRMED_STATUS) return "new";
  if (raw === VOICE_CART_STATUS) return VOICE_CART_STATUS;
  if (PHONE_ORDER_STATUS_SET.has(raw)) return raw as PhoneOrderStatus;
  return "new";
}

export function isSyncDraftOrderStatus(status: string): boolean {
  return (
    status === VOICE_CART_STATUS || status === LEGACY_CONFIRMED_STATUS
  );
}

export function coerceSyncDraftOrderStatus(status: string): string {
  if (status === LEGACY_CONFIRMED_STATUS) return "new";
  return status;
}

export const FINALIZE_ORDER_STATUS: PhoneOrderStatus = "new";

export function isValidStoredOrderStatus(status: string): boolean {
  return (
    status === VOICE_CART_STATUS ||
    status === LEGACY_CONFIRMED_STATUS ||
    PHONE_ORDER_STATUS_SET.has(status)
  );
}
