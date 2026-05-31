import type { SupabaseClient } from "@supabase/supabase-js";
import { loadRestaurantAgentCallSessions } from "@/lib/agent-calls/load-call-sessions";
import {
  buildCallHistoryRows,
  buildCallHistorySummary,
} from "@/lib/call-history/build-call-history-rows";
import type { CallHistorySnapshot } from "@/lib/call-history/types";
import {
  buildReservationBySessionMap,
  isOpenReservationStatus,
} from "@/lib/restaurant-reservations/schema";
import { loadRestaurantMenu } from "@/lib/menu-editor/load-menu";
import { buildMenuPriceContext } from "@/lib/orders/menu-price-context";
import { orderPricingFromProfile } from "@/lib/orders/pricing-settings";
import type { RestaurantProfile } from "@/lib/types";

export const CALL_HISTORY_DEFAULT_RANGE_DAYS = 7;
export const CALL_HISTORY_DEFAULT_LIMIT = 75;
export const CALL_HISTORY_RESERVATION_LIMIT = 25;

export type LoadRestaurantCallHistoryInput = {
  restaurantId: string;
  restaurantName: string;
  since?: string;
  until?: string;
  rangeDays?: number;
  limit?: number;
  profile?: Pick<
    RestaurantProfile,
    "tax_rate_percent" | "service_fee_percent"
  > | null;
};

export async function loadRestaurantCallHistory(
  supabase: SupabaseClient,
  input: LoadRestaurantCallHistoryInput
): Promise<CallHistorySnapshot> {
  const restaurantId = input.restaurantId.trim();
  const rangeDays = input.rangeDays ?? CALL_HISTORY_DEFAULT_RANGE_DAYS;
  const rangeUntil = input.until ?? new Date().toISOString();
  const rangeSince =
    input.since ??
    new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000).toISOString();

  const empty = (): CallHistorySnapshot => ({
    restaurantId,
    restaurantName: input.restaurantName,
    rangeSince,
    rangeUntil,
    rows: [],
    reservationRequests: [],
    summary: {
      totalCalls: 0,
      activeCalls: 0,
      completedOrders: 0,
      voicemailCalls: 0,
      openReservationRequests: 0,
      staffFollowUps: 0,
      noOrderCalls: 0,
      recordingsAvailable: 0,
      transcriptsAvailable: 0,
      orderConversionPercent: null,
    },
    isEmpty: true,
  });

  if (!restaurantId) return empty();

  const limit = input.limit ?? CALL_HISTORY_DEFAULT_LIMIT;

  const [{ sessions, drafts, receipts }, menu, reservationsResult] = await Promise.all([
    loadRestaurantAgentCallSessions(supabase, {
      restaurantId,
      since: rangeSince,
      until: rangeUntil,
      limit,
    }),
    loadRestaurantMenu(supabase, restaurantId).catch(() => null),
    supabase
      .from("restaurant_reservation_requests")
      .select(
        "id, customer_name, customer_phone, party_size, requested_date, requested_time, notes, status, session_id, created_at"
      )
      .eq("restaurant_id", restaurantId)
      .gte("created_at", rangeSince)
      .lte("created_at", rangeUntil)
      .order("created_at", { ascending: false })
      .limit(CALL_HISTORY_RESERVATION_LIMIT),
  ]);

  const reservationRows = reservationsResult.error
    ? []
    : (reservationsResult.data ?? []).map((row) => ({
        id: String(row.id),
        customerName: String(row.customer_name ?? ""),
        customerPhone: String(row.customer_phone ?? ""),
        partySize: Number(row.party_size ?? 0),
        requestedDate: String(row.requested_date ?? ""),
        requestedTime: String(row.requested_time ?? ""),
        notes: row.notes ? String(row.notes) : null,
        status: String(row.status ?? "requested"),
        sessionId: row.session_id ? String(row.session_id) : null,
        createdAt: String(row.created_at),
      }));

  const menuCtx = menu
    ? buildMenuPriceContext(menu.items, menu.modifiers)
    : null;
  const pricing = input.profile
    ? orderPricingFromProfile(input.profile as RestaurantProfile)
    : undefined;

  const reservationBySession = buildReservationBySessionMap(reservationRows);

  const rows = buildCallHistoryRows({
    restaurantId,
    sessions,
    drafts,
    receipts,
    reservationSessionIds: reservationRows.map((row) => row.sessionId),
    reservationBySession,
    menuCtx,
    pricing,
    limit,
  });

  const openReservationRequests = reservationRows.filter((row) =>
    isOpenReservationStatus(row.status)
  ).length;

  return {
    restaurantId,
    restaurantName: input.restaurantName,
    rangeSince,
    rangeUntil,
    rows,
    reservationRequests: reservationRows,
    summary: buildCallHistorySummary({ rows, openReservationRequests }),
    isEmpty: rows.length === 0 && reservationRows.length === 0,
  };
}
