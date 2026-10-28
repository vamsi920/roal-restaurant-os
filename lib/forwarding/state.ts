import type { Db } from "@/lib/db";
import type { CarrierId, ForwardingMode } from "@/lib/forwarding/carriers";

/**
 * not_started: owner hasn't set it up. pending: picked a phone type, not confirmed yet.
 * on: confirmed by a test call or by forwarded calls arriving. quiet: was on, but no
 * calls reached the host for a full open day (forwarding may have been switched off).
 * failed: last test call didn't come through.
 */
export type ForwardingStatus = "not_started" | "pending" | "on" | "quiet" | "failed";

export type ForwardingRow = {
  restaurant_id: string;
  carrier: CarrierId | null;
  mode: ForwardingMode;
  status: ForwardingStatus;
  verified_at: string | null;
  verified_by: "test_call" | "live_calls" | null;
  last_seen_at: string | null;
  quiet_since: string | null;
  last_test: ForwardingTest | null;
  updated_at?: string;
};

export type ForwardingTest = {
  outbound_sid: string;
  started_at: string;
  result: ForwardingTestResult | null;
};

export type ForwardingTestResult = "forwarded" | "answered_at_store" | "not_forwarded" | "error";

/** What the browser gets (no call ids). */
export type ForwardingSummary = {
  restaurantId: string;
  storePhone: string | null;
  roalPhone: string | null;
  carrier: CarrierId | null;
  mode: ForwardingMode;
  status: ForwardingStatus;
  verifiedAt: string | null;
  lastSeenAt: string | null;
};

export const DEFAULT_FORWARDING: Omit<ForwardingRow, "restaurant_id"> = {
  carrier: null,
  mode: "backup",
  status: "not_started",
  verified_at: null,
  verified_by: null,
  last_seen_at: null,
  quiet_since: null,
  last_test: null,
};

export async function loadForwardingRow(db: Db, restaurantId: string): Promise<ForwardingRow> {
  const { data, error } = await db
    .from("restaurant_call_forwarding")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .maybeSingle<ForwardingRow>();
  if (error) throw new Error(error.message);
  return { ...DEFAULT_FORWARDING, ...(data ?? {}), restaurant_id: restaurantId };
}

export async function saveForwardingRow(
  db: Db,
  restaurantId: string,
  patch: Partial<Omit<ForwardingRow, "restaurant_id">>
): Promise<ForwardingRow> {
  const current = await loadForwardingRow(db, restaurantId);
  const next: ForwardingRow = { ...current, ...patch, restaurant_id: restaurantId, updated_at: new Date().toISOString() };
  const { error } = await db.from("restaurant_call_forwarding").upsert(next, { onConflict: "restaurant_id" });
  if (error) throw new Error(error.message);
  return next;
}

export async function loadForwardingPhones(
  db: Db,
  restaurantId: string
): Promise<{ storePhone: string | null; roalPhone: string | null }> {
  const { data } = await db
    .from("restaurant_profiles")
    .select("phone, roal_phone_number")
    .eq("restaurant_id", restaurantId)
    .maybeSingle<{ phone: string | null; roal_phone_number?: string | null }>();
  return { storePhone: data?.phone ?? null, roalPhone: data?.roal_phone_number ?? null };
}

export function summarizeForwarding(
  row: ForwardingRow,
  phones: { storePhone: string | null; roalPhone: string | null }
): ForwardingSummary {
  return {
    restaurantId: row.restaurant_id,
    storePhone: phones.storePhone,
    roalPhone: phones.roalPhone,
    carrier: row.carrier,
    mode: row.mode,
    status: row.status,
    verifiedAt: row.verified_at,
    lastSeenAt: row.last_seen_at,
  };
}

export async function loadForwardingSummary(db: Db, restaurantId: string): Promise<ForwardingSummary> {
  const [row, phones] = await Promise.all([loadForwardingRow(db, restaurantId), loadForwardingPhones(db, restaurantId)]);
  return summarizeForwarding(row, phones);
}
