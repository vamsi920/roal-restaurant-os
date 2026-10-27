import type { Db } from "@/lib/db";
import { loadRestaurantCommandCenter } from "@/lib/command-center/load-command-center";
import type { CommandCenterCallRow } from "@/lib/command-center/types";
import {
  loadOrderCallEvidenceBySession,
  type OrderCallEvidence,
} from "@/lib/live-orders/call-evidence";
import {
  filterDraftOrdersForRestaurant,
  filterReceiptsForRestaurant,
} from "@/lib/live-orders/kds-orders-surface";
import { LIVE_ORDERS_RECEIPT_LIMIT } from "@/lib/live-orders/load-live-orders-page";
import type { DraftOrderRow, PhoneOrderReceiptRow } from "@/lib/types";

/** What the Kitchen board (LiveOrdersPanel) polls for. */
export type LiveOrdersPayload = {
  draftOrders: DraftOrderRow[];
  receipts: PhoneOrderReceiptRow[];
  callEvidenceBySession: Record<string, OrderCallEvidence>;
  activeCalls: CommandCenterCallRow[];
  error: string | null;
  serverTime: string;
};

/**
 * Kitchen board snapshot for ONE restaurant. Callers must have verified access
 * to `restaurantId` (requireRestaurantAccess) — every query below filters by it.
 */
export async function loadLiveOrdersPayload(
  db: Db,
  input: { restaurantId: string; restaurantName: string }
): Promise<LiveOrdersPayload> {
  const restaurantId = input.restaurantId.trim();
  const until = new Date().toISOString();
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const [draftsRes, receiptsRes, commandCenter] = await Promise.all([
    db
      .from("draft_orders")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("updated_at", { ascending: false }),
    db
      .from("phone_order_receipts")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false })
      .limit(LIVE_ORDERS_RECEIPT_LIMIT),
    loadRestaurantCommandCenter(db, {
      restaurantId,
      restaurantName: input.restaurantName,
      since,
      until,
      limits: { active: 12, completed: 0, failed: 8, handoff: 8, unknown: 8 },
    }).catch(() => null),
  ]);

  const draftOrders = filterDraftOrdersForRestaurant(
    (draftsRes.data as DraftOrderRow[] | null) ?? [],
    restaurantId
  );
  const receipts = filterReceiptsForRestaurant(
    (receiptsRes.data as PhoneOrderReceiptRow[] | null) ?? [],
    restaurantId
  );

  const callEvidenceBySession = await loadOrderCallEvidenceBySession(db, {
    restaurantId,
    sessionIds: [
      ...draftOrders.map((r) => r.session_id),
      ...receipts.map((r) => r.session_id),
    ].filter((s): s is string => typeof s === "string"),
  }).catch(() => ({}));

  return {
    draftOrders,
    receipts,
    callEvidenceBySession,
    activeCalls: commandCenter?.activeCalls ?? [],
    error: draftsRes.error?.message ?? receiptsRes.error?.message ?? null,
    serverTime: until,
  };
}

/** What the menu-page call badge (MenuSetupCallIndicator) polls for. */
export type LiveCallStatusPayload = {
  drafts: Array<Pick<DraftOrderRow, "id" | "status" | "updated_at">>;
  serverTime: string;
};

export async function loadLiveCallStatusPayload(
  db: Db,
  restaurantId: string
): Promise<LiveCallStatusPayload> {
  const { data, error } = await db
    .from("draft_orders")
    .select("id, status, updated_at, restaurant_id")
    .eq("restaurant_id", restaurantId)
    .order("updated_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return {
    drafts: ((data ?? []) as Array<DraftOrderRow>)
      .filter((r) => r.restaurant_id === restaurantId)
      .map((r) => ({ id: r.id, status: r.status, updated_at: r.updated_at })),
    serverTime: new Date().toISOString(),
  };
}
