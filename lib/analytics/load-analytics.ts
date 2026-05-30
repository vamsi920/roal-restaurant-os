import type { SupabaseClient } from "@supabase/supabase-js";
import {
  aggregateMenuScans,
  aggregatePopularItems,
  popularItemSources,
  averagePrepMinutes,
  buildMenuContexts,
  countCanceledByRestaurant,
  countReceiptsByRestaurant,
  conversionPercent,
  estimateRevenueCents,
  prepMinutesByRestaurant,
  type MenuImportRow,
  type OrderRow,
  type ReceiptRow,
  type UsageRow,
} from "@/lib/analytics/aggregate";
import {
  averageOrderEstimateCents,
  bucketOrderSessionsByDay,
  collectOrderSessions,
  computeSessionConversionTrend,
  countStuckKitchenOrders,
  peakOrderHoursFromReceipts,
  sessionHasCompletedOrder,
} from "@/lib/analytics/phone-ops-metrics";
import {
  analyticsRangeBounds,
  buildDaySeries,
  parseAnalyticsRangeKey,
} from "@/lib/analytics/range";
import type {
  AnalyticsRangeKey,
  AnalyticsSnapshot,
  RestaurantAnalyticsRow,
} from "@/lib/analytics/types";
import { orderPricingFromProfile } from "@/lib/orders/pricing-settings";
import type {
  DbItem,
  DbModifier,
  Restaurant,
  RestaurantProfile,
} from "@/lib/types";

export async function loadRestaurantAnalytics(
  supabase: SupabaseClient,
  input: {
    organizationId: string;
    organizationName: string;
    restaurantId: string;
    restaurantName: string;
    rangeKey?: AnalyticsRangeKey | string | string[];
  }
): Promise<AnalyticsSnapshot> {
  return loadOrganizationAnalytics(supabase, {
    organizationId: input.organizationId,
    organizationName: input.organizationName,
    restaurantId: input.restaurantId,
    restaurantName: input.restaurantName,
    rangeKey: input.rangeKey,
  });
}

export async function loadOrganizationAnalytics(
  supabase: SupabaseClient,
  input: {
    organizationId: string;
    organizationName: string;
    restaurantId?: string;
    restaurantName?: string;
    rangeKey?: AnalyticsRangeKey | string | string[];
  }
): Promise<AnalyticsSnapshot> {
  const scope: AnalyticsSnapshot["scope"] = input.restaurantId
    ? "restaurant"
    : "organization";
  const rangeKey = parseAnalyticsRangeKey(input.rangeKey);
  const { since, until } = analyticsRangeBounds(rangeKey);
  const sinceIso = since.toISOString();
  const untilIso = until.toISOString();
  const dayKeys = buildDaySeries(since, until);

  const { data: restaurants, error: restError } = await supabase
    .from("restaurants")
    .select("id, name")
    .eq("organization_id", input.organizationId)
    .order("name", { ascending: true });

  if (restError) throw new Error(restError.message);

  const restList = (restaurants ?? []) as Pick<Restaurant, "id" | "name">[];
  const scopedRestList = input.restaurantId
    ? restList.filter((r) => r.id === input.restaurantId)
    : restList;
  const restaurantIds = scopedRestList.map((r) => r.id);
  const restaurantIdSet = new Set(restaurantIds);
  if (restaurantIds.length === 0) {
    return emptySnapshot(input, rangeKey, sinceIso, untilIso, dayKeys, scope);
  }

  const usageQuery = supabase
    .from("usage_events")
    .select("event_type, occurred_at, restaurant_id, session_id, metadata")
    .eq("organization_id", input.organizationId)
    .gte("occurred_at", sinceIso)
    .lte("occurred_at", untilIso);

  const importsQuery = supabase
    .from("menu_imports")
    .select("extraction_status, created_at")
    .eq("organization_id", input.organizationId)
    .gte("created_at", sinceIso)
    .lte("created_at", untilIso);

  if (input.restaurantId) {
    usageQuery.eq("restaurant_id", input.restaurantId);
    importsQuery.eq("restaurant_id", input.restaurantId);
  }

  const [
    usageResult,
    ordersResult,
    receiptsResult,
    importsResult,
    categoriesResult,
    profilesResult,
  ] = await Promise.all([
    usageQuery,
    supabase
      .from("draft_orders")
      .select(
        "restaurant_id, session_id, status, items, created_at, updated_at, completed_at, canceled_at"
      )
      .in("restaurant_id", restaurantIds)
      .gte("created_at", sinceIso)
      .lte("created_at", untilIso),
    supabase
      .from("phone_order_receipts")
      .select("restaurant_id, session_id, items, created_at")
      .in("restaurant_id", restaurantIds)
      .gte("created_at", sinceIso)
      .lte("created_at", untilIso),
    importsQuery,
    supabase
      .from("categories")
      .select("id, restaurant_id")
      .in("restaurant_id", restaurantIds),
    supabase
      .from("restaurant_profiles")
      .select("restaurant_id, tax_rate_percent, service_fee_percent")
      .in("restaurant_id", restaurantIds),
  ]);

  for (const result of [
    usageResult,
    ordersResult,
    receiptsResult,
    importsResult,
    categoriesResult,
    profilesResult,
  ]) {
    if (result.error) throw new Error(result.error.message);
  }

  const usage = (usageResult.data ?? []) as UsageRow[];
  const orders = (ordersResult.data ?? []) as OrderRow[];
  const receipts = (receiptsResult.data ?? []) as ReceiptRow[];
  const imports = (importsResult.data ?? []) as MenuImportRow[];

  const categoryRestaurantMap = new Map<string, string>();
  for (const cat of categoriesResult.data ?? []) {
    categoryRestaurantMap.set(cat.id as string, cat.restaurant_id as string);
  }

  const categoryIds = [...categoryRestaurantMap.keys()];
  let allItems: DbItem[] = [];
  let modifiers: DbModifier[] = [];

  if (categoryIds.length > 0) {
    const { data: itemRows, error: itemsScopedError } = await supabase
      .from("items")
      .select("*")
      .in("category_id", categoryIds);
    if (itemsScopedError) throw new Error(itemsScopedError.message);
    allItems = (itemRows ?? []) as DbItem[];

    const itemIds = allItems.map((i) => i.id);
    if (itemIds.length > 0) {
      const { data: modRows, error: modError } = await supabase
        .from("modifiers")
        .select("*")
        .in("item_id", itemIds);
      if (modError) throw new Error(modError.message);
      modifiers = (modRows as DbModifier[]) ?? [];
    }
  }

  const menuByRestaurant = buildMenuContexts(
    allItems,
    modifiers,
    restaurantIds,
    categoryRestaurantMap
  );

  const pricingByRestaurant = new Map(
    ((profilesResult.data ?? []) as Pick<
      RestaurantProfile,
      "restaurant_id" | "tax_rate_percent" | "service_fee_percent"
    >[]).map((p) => [
      p.restaurant_id,
      orderPricingFromProfile(p),
    ])
  );

  const sessionMap = collectOrderSessions(
    orders,
    receipts,
    usage,
    restaurantIdSet
  );
  const sessions = [...sessionMap.values()];
  const orderSessions = sessions.length;
  const sessionsWithCompletedOrder = sessions.filter((s) =>
    sessionHasCompletedOrder(s)
  ).length;
  const sessionConversionPercent = conversionPercent(
    sessionsWithCompletedOrder,
    orderSessions
  );

  const ordersCanceled = orders.filter((o) => o.status === "canceled").length;
  const ordersFinalized = receipts.length;
  const completedKitchenOrders = orders.filter(
    (o) => o.status === "completed"
  ).length;
  const stuckOrderCount = countStuckKitchenOrders(orders);

  const completedOrders = orders.filter((o) => o.status === "completed");
  const prep = averagePrepMinutes(completedOrders);
  const revenue = estimateRevenueCents(
    completedOrders,
    menuByRestaurant,
    pricingByRestaurant
  );
  const avgOrder = averageOrderEstimateCents(
    completedOrders,
    receipts,
    menuByRestaurant,
    pricingByRestaurant
  );

  const ordersOverTime = bucketOrderSessionsByDay(
    orders,
    receipts,
    usage,
    dayKeys,
    restaurantIdSet
  );
  const peakHours = peakOrderHoursFromReceipts(receipts);
  const conversionTrend = computeSessionConversionTrend(
    sessions,
    sinceIso,
    untilIso
  );

  const popularSources = popularItemSources(completedOrders, receipts);

  const canceledByRest = countCanceledByRestaurant(orders);
  const receiptsByRest = countReceiptsByRestaurant(receipts);
  const prepByRest = prepMinutesByRestaurant(completedOrders);

  const byRestaurant: RestaurantAnalyticsRow[] = scopedRestList.map((r) => {
    const restSessions = sessions.filter((s) => s.restaurantId === r.id);
    const restCompletedSessions = restSessions.filter((s) =>
      sessionHasCompletedOrder(s)
    ).length;
    const restCompleted = completedOrders.filter(
      (o) => o.restaurant_id === r.id
    );
    const restOrders = orders.filter((o) => o.restaurant_id === r.id);
    const restRevenue = estimateRevenueCents(
      restCompleted,
      menuByRestaurant,
      pricingByRestaurant
    );
    const prepSlice = prepByRest.get(r.id) ?? { avg: null, sampleSize: 0 };

    return {
      restaurantId: r.id,
      restaurantName: r.name,
      orderSessions: restSessions.length,
      sessionsCompleted: restCompletedSessions,
      finalized: receiptsByRest.get(r.id) ?? 0,
      completedKitchen: restCompleted.length,
      canceled: canceledByRest.get(r.id) ?? 0,
      conversionPercent: conversionPercent(
        restCompletedSessions,
        restSessions.length
      ),
      revenueCents: restRevenue.totalCents,
      revenueComplete: restRevenue.complete,
      avgPrepMinutes: prepSlice.avg,
      stuckOrders: countStuckKitchenOrders(restOrders),
    };
  });

  return {
    organizationId: input.organizationId,
    organizationName: input.organizationName,
    scope,
    restaurantId: input.restaurantId ?? null,
    restaurantName: input.restaurantName ?? scopedRestList[0]?.name ?? null,
    rangeKey,
    since: sinceIso,
    until: untilIso,
    restaurantCount: scopedRestList.length,
    summary: {
      orderSessions,
      sessionsWithCompletedOrder,
      sessionConversionPercent,
      ordersFinalized,
      completedKitchenOrders,
      ordersCanceled,
      avgPrepMinutes: prep.avg,
      prepSampleSize: prep.sampleSize,
      revenueCents: revenue.totalCents,
      revenueComplete: revenue.complete,
      revenueOrderCount: revenue.orderCount,
      averageOrderCents: avgOrder.avgCents,
      averageOrderComplete: avgOrder.complete,
      averageOrderSampleSize: avgOrder.sampleSize,
      stuckOrderCount,
    },
    ordersOverTime,
    peakHours,
    conversionTrend,
    popularItems: aggregatePopularItems(popularSources),
    byRestaurant,
    menuScans: aggregateMenuScans(
      imports,
      usage.filter((e) => e.event_type === "menu_scan")
    ),
  };
}

function emptySnapshot(
  input: {
    organizationId: string;
    organizationName: string;
    restaurantId?: string;
    restaurantName?: string;
  },
  rangeKey: AnalyticsRangeKey,
  since: string,
  until: string,
  dayKeys: string[],
  scope: AnalyticsSnapshot["scope"] = input.restaurantId
    ? "restaurant"
    : "organization"
): AnalyticsSnapshot {
  return {
    organizationId: input.organizationId,
    organizationName: input.organizationName,
    scope,
    restaurantId: input.restaurantId ?? null,
    restaurantName: input.restaurantName ?? null,
    rangeKey,
    since,
    until,
    restaurantCount: 0,
    summary: {
      orderSessions: 0,
      sessionsWithCompletedOrder: 0,
      sessionConversionPercent: null,
      ordersFinalized: 0,
      completedKitchenOrders: 0,
      ordersCanceled: 0,
      avgPrepMinutes: null,
      prepSampleSize: 0,
      revenueCents: null,
      revenueComplete: true,
      revenueOrderCount: 0,
      averageOrderCents: null,
      averageOrderComplete: true,
      averageOrderSampleSize: 0,
      stuckOrderCount: 0,
    },
    ordersOverTime: dayKeys.map((date) => ({
      date,
      orderSessions: 0,
      completed: 0,
      canceled: 0,
    })),
    peakHours: [],
    conversionTrend: {
      label: "Later half vs earlier half of range",
      priorPercent: null,
      recentPercent: null,
      deltaPoints: null,
      priorSessions: 0,
      recentSessions: 0,
      priorCompleted: 0,
      recentCompleted: 0,
    },
    popularItems: [],
    byRestaurant: [],
    menuScans: {
      attempts: 0,
      extracted: 0,
      committed: 0,
      failed: 0,
      successPercent: null,
    },
  };
}
