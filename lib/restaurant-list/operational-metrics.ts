import {
  filterBillablePhoneOrderReceipts,
  isTestHarnessBillingSession,
  type BillableReceiptRow,
} from "@/lib/billing/billable-orders";
import { followUpReasonFromTranscriptMetadata } from "@/lib/call-history/build-call-history-rows";
import { isVoicemailTranscriptMetadata } from "@/lib/agent-calls/voicemail-call";
import { isTerminalOrderStatus, normalizeOrderStatus } from "@/lib/order-status";
import { isOpenReservationStatus } from "@/lib/restaurant-reservations/schema";

function maxIsoTimestamp(
  current: string | null,
  candidate: string | null | undefined
): string | null {
  if (!candidate?.trim()) return current;
  const next = candidate.trim();
  if (!current) return next;
  return new Date(next).getTime() > new Date(current).getTime() ? next : current;
}

export const PORTFOLIO_ORDER_PERIOD_MS = 24 * 60 * 60 * 1000;
export const PORTFOLIO_FOLLOW_UP_LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;

type CallEventRow = {
  restaurant_id: string;
  session_id: string | null;
  status: string;
  outcome: string;
  transcript_metadata: Record<string, unknown> | null;
  started_at: string;
  ended_at: string | null;
};

type DraftOrderRow = {
  restaurant_id: string;
  session_id: string;
  status: string;
  updated_at: string;
  completed_at?: string | null;
};

type ReservationRow = {
  restaurant_id: string;
  status: string;
};

function isHarnessSession(sessionId: string | null | undefined): boolean {
  return isTestHarnessBillingSession(sessionId);
}

function isSuccessfulDraft(row: DraftOrderRow): boolean {
  if (isHarnessSession(row.session_id)) return false;
  return normalizeOrderStatus(row.status) === "completed";
}

export function countActiveCallsByRestaurant(
  events: CallEventRow[]
): Map<string, number> {
  const sessionsByRestaurant = new Map<string, Set<string>>();
  for (const row of events) {
    if (row.status !== "active") continue;
    if (isHarnessSession(row.session_id)) continue;
    const restaurantId = row.restaurant_id?.trim();
    const sessionId = row.session_id?.trim();
    if (!restaurantId || !sessionId) continue;
    const set = sessionsByRestaurant.get(restaurantId) ?? new Set<string>();
    set.add(sessionId);
    sessionsByRestaurant.set(restaurantId, set);
  }
  const counts = new Map<string, number>();
  for (const [restaurantId, sessions] of sessionsByRestaurant) {
    counts.set(restaurantId, sessions.size);
  }
  return counts;
}

export function countOpenFollowUpsByRestaurant(
  events: CallEventRow[],
  sinceMs: number
): Map<string, number> {
  const sessionsByRestaurant = new Map<string, Set<string>>();
  for (const row of events) {
    if (row.status === "active") continue;
    if (isHarnessSession(row.session_id)) continue;
    const restaurantId = row.restaurant_id?.trim();
    const sessionId = row.session_id?.trim();
    if (!restaurantId || !sessionId) continue;

    const occurredAt = row.ended_at ?? row.started_at;
    const ms = new Date(occurredAt).getTime();
    if (Number.isNaN(ms) || ms < sinceMs) continue;

    const metadata = row.transcript_metadata ?? {};
    const followUp = followUpReasonFromTranscriptMetadata(metadata);
    const voicemail = isVoicemailTranscriptMetadata(metadata);
    const actionable =
      Boolean(followUp) ||
      voicemail ||
      (row.outcome === "no_order" && followUp != null);

    if (!actionable && !voicemail && !followUp) continue;

    const set = sessionsByRestaurant.get(restaurantId) ?? new Set<string>();
    set.add(sessionId);
    sessionsByRestaurant.set(restaurantId, set);
  }
  const counts = new Map<string, number>();
  for (const [restaurantId, sessions] of sessionsByRestaurant) {
    counts.set(restaurantId, sessions.size);
  }
  return counts;
}

export function countOpenReservationsByRestaurant(
  rows: ReservationRow[]
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const restaurantId = row.restaurant_id?.trim();
    if (!restaurantId) continue;
    if (!isOpenReservationStatus(row.status)) continue;
    counts.set(restaurantId, (counts.get(restaurantId) ?? 0) + 1);
  }
  return counts;
}

export function successfulOrdersInPeriodByRestaurant(
  receipts: BillableReceiptRow[],
  drafts: DraftOrderRow[],
  sinceIso: string
): Map<string, number> {
  const sinceMs = new Date(sinceIso).getTime();
  const sessionsByRestaurant = new Map<string, Set<string>>();

  for (const row of filterBillablePhoneOrderReceipts(receipts)) {
    const ms = new Date(row.created_at).getTime();
    if (Number.isNaN(ms) || ms < sinceMs) continue;
    const restaurantId = row.restaurant_id.trim();
    const sessionId = row.session_id.trim();
    const set = sessionsByRestaurant.get(restaurantId) ?? new Set<string>();
    set.add(sessionId);
    sessionsByRestaurant.set(restaurantId, set);
  }

  for (const row of drafts) {
    if (!isSuccessfulDraft(row)) continue;
    const ms = new Date(row.completed_at ?? row.updated_at).getTime();
    if (Number.isNaN(ms) || ms < sinceMs) continue;
    const restaurantId = row.restaurant_id.trim();
    const sessionId = row.session_id.trim();
    const set = sessionsByRestaurant.get(restaurantId) ?? new Set<string>();
    set.add(sessionId);
    sessionsByRestaurant.set(restaurantId, set);
  }

  const counts = new Map<string, number>();
  for (const [restaurantId, sessions] of sessionsByRestaurant) {
    counts.set(restaurantId, sessions.size);
  }
  return counts;
}

export function lastSuccessfulOrderAtByRestaurant(
  receipts: BillableReceiptRow[],
  drafts: DraftOrderRow[]
): Map<string, string> {
  const map = new Map<string, string>();

  for (const row of filterBillablePhoneOrderReceipts(receipts)) {
    const restaurantId = row.restaurant_id.trim();
    const prev = map.get(restaurantId) ?? null;
    map.set(restaurantId, maxIsoTimestamp(prev, row.created_at) ?? row.created_at);
  }

  for (const row of drafts) {
    if (!isSuccessfulDraft(row)) continue;
    if (isTerminalOrderStatus(row.status) && normalizeOrderStatus(row.status) === "canceled") {
      continue;
    }
    const restaurantId = row.restaurant_id.trim();
    const at = row.completed_at ?? row.updated_at;
    const prev = map.get(restaurantId) ?? null;
    map.set(restaurantId, maxIsoTimestamp(prev, at) ?? at);
  }

  return map;
}

export function portfolioPeriodSinceIso(now = Date.now()): string {
  return new Date(now - PORTFOLIO_ORDER_PERIOD_MS).toISOString();
}

export function followUpLookbackSinceIso(now = Date.now()): string {
  return new Date(now - PORTFOLIO_FOLLOW_UP_LOOKBACK_MS).toISOString();
}
