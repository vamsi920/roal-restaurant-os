import type { Db } from "@/lib/db";
import type {
  AgentCallEventAnalyticsRow,
  OrderRow,
  ReceiptRow,
  UpsellRuleAnalyticsRow,
} from "@/lib/analytics/aggregate";
import { loadRestaurantCallHistory } from "@/lib/call-history/load-call-history";
import { loadRestaurantMenu } from "@/lib/menu-editor/load-menu";
import { buildMenuPriceContext } from "@/lib/orders/menu-price-context";
import { orderPricingFromProfile } from "@/lib/orders/pricing-settings";
import {
  buildActivityItems,
  formatMonthLabel,
  lastDayKeys,
  monthStartUtc,
  OVERVIEW_SERIES_DAYS,
  safeTimeZone,
  seriesStartUtc,
} from "@/lib/overview/aggregate";
import { computeMonthStats, computeOverviewSeries } from "@/lib/overview/month-stats";
import type { OverviewLaunch, OverviewSnapshot } from "@/lib/overview/types";
import { loadRestaurantLaunchGate } from "@/lib/restaurant-launch/load-checklist";
import { defaultAgentName } from "@/lib/trial/voices";
import type { RestaurantProfile } from "@/lib/types";

const MAX_ROWS = 5000;

/**
 * Everything the Overview home needs for one location. Each query degrades to
 * empty data (with a warning) so a single failing table never blanks the page.
 */
export async function loadRestaurantOverview(
  supabase: Db,
  input: {
    restaurantId: string;
    restaurantName: string;
    profile: RestaurantProfile;
    now?: Date;
  }
): Promise<OverviewSnapshot> {
  const now = input.now ?? new Date();
  const restaurantId = input.restaurantId;
  const timezone = safeTimeZone(input.profile.timezone);
  const monthStart = monthStartUtc(now, timezone);
  const seriesStart = seriesStartUtc(now, timezone, OVERVIEW_SERIES_DAYS);
  const since = new Date(Math.min(monthStart.getTime(), seriesStart.getTime())).toISOString();
  const warnings: string[] = [];

  const note = (label: string, error: { message?: string } | null | undefined) => {
    if (error) warnings.push(`${label}: ${error.message ?? "failed"}`);
  };

  const [receiptsRes, ordersRes, callsRes, rulesRes, menu, history, launch] = await Promise.all([
    supabase
      .from("phone_order_receipts")
      .select("restaurant_id, session_id, items, created_at")
      .eq("restaurant_id", restaurantId)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(MAX_ROWS),
    supabase
      .from("draft_orders")
      .select(
        "restaurant_id, session_id, status, items, created_at, updated_at, completed_at, canceled_at"
      )
      .eq("restaurant_id", restaurantId)
      .eq("status", "completed")
      .gte("created_at", monthStart.toISOString())
      .limit(MAX_ROWS),
    supabase
      .from("agent_call_events")
      .select("restaurant_id, session_id, status, outcome, started_at, ended_at, transcript_metadata")
      .eq("restaurant_id", restaurantId)
      .gte("started_at", since)
      .order("started_at", { ascending: false })
      .limit(MAX_ROWS),
    supabase
      .from("restaurant_upsell_rules")
      .select("restaurant_id, trigger_text, offer_text, is_active")
      .eq("restaurant_id", restaurantId)
      .eq("is_active", true),
    loadRestaurantMenu(supabase, restaurantId).catch((err: unknown) => {
      warnings.push(`menu: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }),
    loadRestaurantCallHistory(supabase, {
      restaurantId,
      restaurantName: input.restaurantName,
      rangeDays: 7,
      limit: 30,
      profile: input.profile,
    }).catch((err: unknown) => {
      warnings.push(`call history: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }),
    loadLaunch(supabase, restaurantId, input.restaurantName).catch((err: unknown) => {
      warnings.push(`launch: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }),
  ]);

  note("receipts", receiptsRes.error);
  note("orders", ordersRes.error);
  note("calls", callsRes.error);
  note("upsell rules", rulesRes.error);

  const raw = {
    restaurantId,
    receipts: (receiptsRes.error ? [] : receiptsRes.data ?? []) as ReceiptRow[],
    completedOrders: (ordersRes.error ? [] : ordersRes.data ?? []) as OrderRow[],
    callEvents: (callsRes.error ? [] : callsRes.data ?? []) as AgentCallEventAnalyticsRow[],
    upsellRules: (rulesRes.error ? [] : rulesRes.data ?? []) as UpsellRuleAnalyticsRow[],
    menu: menu ? buildMenuPriceContext(menu.items, menu.modifiers) : null,
    pricing: orderPricingFromProfile(input.profile),
  };

  const dayKeys = lastDayKeys(now, timezone, OVERVIEW_SERIES_DAYS);

  return {
    restaurantId,
    restaurantName: input.restaurantName,
    timezone,
    hostName: input.profile.agent_display_name?.trim() || defaultAgentName(input.profile.agent_voice_id),
    monthLabel: formatMonthLabel(now, timezone),
    month: computeMonthStats(raw, monthStart, now),
    series: computeOverviewSeries(raw, dayKeys, timezone),
    activity: buildActivityItems(history?.rows ?? []),
    launch,
    warnings,
  };
}

async function loadLaunch(
  supabase: Db,
  restaurantId: string,
  restaurantName: string
): Promise<OverviewLaunch> {
  const gate = await loadRestaurantLaunchGate(supabase, { restaurantId, restaurantName });
  return {
    isLive: gate.isLiveReady,
    completedCount: gate.checklist.completedCount,
    totalCount: gate.checklist.totalCount,
    items: gate.checklist.items.map((item) => ({
      id: item.id,
      label: item.label,
      status: item.status,
      detail: item.detail ?? null,
      href: item.href,
      automatic: item.automatic ?? false,
    })),
    primaryAction: gate.isLiveReady ? null : gate.primaryAction,
  };
}
