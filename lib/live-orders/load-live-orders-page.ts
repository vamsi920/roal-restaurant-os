import type { SupabaseClient } from "@supabase/supabase-js";
import { loadRestaurantCommandCenter } from "@/lib/command-center/load-command-center";
import type { CommandCenterCallRow } from "@/lib/command-center/types";
import { buildRecentPhoneOutcomes } from "@/lib/live-orders/build-recent-outcomes";
import {
  loadOrderCallEvidenceBySession,
  type OrderCallEvidence,
} from "@/lib/live-orders/call-evidence";
import { loadRestaurantLaunchGate } from "@/lib/restaurant-launch/load-checklist";
import type { LaunchGateSnapshot } from "@/lib/restaurant-launch/types";
import type { DraftOrderRow, PhoneOrderReceiptRow, RestaurantProfile } from "@/lib/types";
import type { LiveOrdersRecentOutcome } from "@/lib/live-orders/build-recent-outcomes";
import {
  filterDraftOrdersForRestaurant,
  filterReceiptsForRestaurant,
} from "@/lib/live-orders/kds-orders-surface";

export const LIVE_ORDERS_RECEIPT_LIMIT = 150;
export const LIVE_ORDERS_OUTCOMES_RANGE_HOURS = 48;

export type LiveOrdersPageSnapshot = {
  restaurantId: string;
  restaurantName: string;
  launchGate: LaunchGateSnapshot;
  activeCalls: CommandCenterCallRow[];
  recentOutcomes: LiveOrdersRecentOutcome[];
  outcomesEmpty: boolean;
  rangeSince: string;
  rangeUntil: string;
  initialDraftOrders: DraftOrderRow[];
  initialReceipts: PhoneOrderReceiptRow[];
  initialCallEvidenceBySession: Record<string, OrderCallEvidence>;
  ordersLoadError: string | null;
};

export async function loadLiveOrdersPageData(
  supabase: SupabaseClient,
  input: {
    restaurantId: string;
    restaurantName: string;
    profile: Pick<
      RestaurantProfile,
      | "elevenlabs_agent_id"
      | "elevenlabs_last_sync_at"
      | "elevenlabs_last_sync_error"
      | "elevenlabs_menu_auto_sync_status"
      | "elevenlabs_menu_auto_sync_error"
    >;
    ordersDb?: SupabaseClient;
  }
): Promise<LiveOrdersPageSnapshot> {
  const restaurantId = input.restaurantId.trim();
  const rangeUntil = new Date().toISOString();
  const rangeSince = new Date(
    Date.now() - LIVE_ORDERS_OUTCOMES_RANGE_HOURS * 60 * 60 * 1000
  ).toISOString();

  const ordersClient = input.ordersDb ?? supabase;

  const [commandCenter, draftsRes, receiptsRes, launchGate] = await Promise.all([
    loadRestaurantCommandCenter(supabase, {
      restaurantId,
      restaurantName: input.restaurantName,
      since: rangeSince,
      until: rangeUntil,
      limits: {
        active: 12,
        completed: 0,
        failed: 8,
        handoff: 8,
        unknown: 8,
      },
    }),
    ordersClient
      .from("draft_orders")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("updated_at", { ascending: false }),
    ordersClient
      .from("phone_order_receipts")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false })
      .limit(LIVE_ORDERS_RECEIPT_LIMIT),
    loadRestaurantLaunchGate(supabase, {
      restaurantId,
      restaurantName: input.restaurantName,
    }),
  ]);

  const draftErr = draftsRes.error?.message ?? null;
  const receiptErr = receiptsRes.error?.message ?? null;

  const initialDraftOrders = filterDraftOrdersForRestaurant(
    (draftsRes.data as DraftOrderRow[]) ?? [],
    restaurantId
  );
  const initialReceipts = receiptErr
    ? []
    : filterReceiptsForRestaurant(
        (receiptsRes.data as PhoneOrderReceiptRow[]) ?? [],
        restaurantId
      );
  const sessionIds = [
    ...initialDraftOrders.map((row) => row.session_id),
    ...initialReceipts.map((row) => row.session_id),
  ];
  const initialCallEvidenceBySession = await loadOrderCallEvidenceBySession(
    ordersClient,
    {
      restaurantId,
      sessionIds,
    }
  ).catch(() => ({}));

  const recentOutcomes = buildRecentPhoneOutcomes({
    failed: commandCenter.failedCalls,
    handoff: commandCenter.handoffCalls,
    unknown: commandCenter.unknownCalls,
    limit: 10,
  });

  return {
    restaurantId,
    restaurantName: input.restaurantName,
    launchGate,
    activeCalls: commandCenter.activeCalls,
    recentOutcomes,
    outcomesEmpty: recentOutcomes.length === 0,
    rangeSince: commandCenter.rangeSince,
    rangeUntil: commandCenter.rangeUntil,
    initialDraftOrders,
    initialReceipts,
    initialCallEvidenceBySession,
    ordersLoadError: draftErr ?? receiptErr,
  };
}
