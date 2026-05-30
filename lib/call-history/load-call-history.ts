import type { SupabaseClient } from "@supabase/supabase-js";
import { loadRestaurantAgentCallSessions } from "@/lib/agent-calls/load-call-sessions";
import { buildCallHistoryRows } from "@/lib/call-history/build-call-history-rows";
import type { CallHistorySnapshot } from "@/lib/call-history/types";
import { loadRestaurantMenu } from "@/lib/menu-editor/load-menu";
import { buildMenuPriceContext } from "@/lib/orders/menu-price-context";
import { orderPricingFromProfile } from "@/lib/orders/pricing-settings";
import type { RestaurantProfile } from "@/lib/types";

export const CALL_HISTORY_DEFAULT_RANGE_DAYS = 7;
export const CALL_HISTORY_DEFAULT_LIMIT = 75;

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
    isEmpty: true,
  });

  if (!restaurantId) return empty();

  const limit = input.limit ?? CALL_HISTORY_DEFAULT_LIMIT;

  const [{ sessions, drafts, receipts }, menu] = await Promise.all([
    loadRestaurantAgentCallSessions(supabase, {
      restaurantId,
      since: rangeSince,
      until: rangeUntil,
      limit,
    }),
    loadRestaurantMenu(supabase, restaurantId).catch(() => null),
  ]);

  const menuCtx = menu
    ? buildMenuPriceContext(menu.items, menu.modifiers)
    : null;
  const pricing = input.profile
    ? orderPricingFromProfile(input.profile as RestaurantProfile)
    : undefined;

  const rows = buildCallHistoryRows({
    sessions,
    drafts,
    receipts,
    menuCtx,
    pricing,
    limit,
  });

  return {
    restaurantId,
    restaurantName: input.restaurantName,
    rangeSince,
    rangeUntil,
    rows,
    isEmpty: rows.length === 0,
  };
}
