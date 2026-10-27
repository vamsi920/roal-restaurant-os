/**
 * Pure month rollup for the Overview stat cards. Reuses the analytics helpers
 * so "revenue" and "upsell revenue" match the Reports page.
 */
import {
  aggregateUpsellAttachStats,
  estimateRevenueCents,
  popularItemSources,
  type AgentCallEventAnalyticsRow,
  type OrderRow,
  type ReceiptRow,
  type UpsellRuleAnalyticsRow,
} from "@/lib/analytics/aggregate";
import { excludeTestHarnessSessions } from "@/lib/analytics/exclude-test-sessions";
import { filterBillablePhoneOrderReceipts } from "@/lib/billing/billable-orders";
import type { MenuPriceContext } from "@/lib/orders/menu-price-context";
import type { OrderPricingSettings } from "@/lib/orders/pricing-settings";
import {
  buildDailySeries,
  isWithin,
  sumCallDurationSeconds,
} from "@/lib/overview/aggregate";
import type { OverviewDayPoint, OverviewMonthStats } from "@/lib/overview/types";

export type OverviewRawData = {
  restaurantId: string;
  receipts: ReceiptRow[];
  completedOrders: OrderRow[];
  callEvents: AgentCallEventAnalyticsRow[];
  upsellRules: UpsellRuleAnalyticsRow[];
  menu: MenuPriceContext | null;
  pricing: OrderPricingSettings;
};

export function computeMonthStats(
  raw: OverviewRawData,
  monthStart: Date,
  now: Date = new Date()
): OverviewMonthStats {
  const receipts = filterBillablePhoneOrderReceipts(
    raw.receipts.filter((r) => isWithin(r.created_at, monthStart, now))
  ) as ReceiptRow[];
  const completedOrders = excludeTestHarnessSessions(
    raw.completedOrders.filter(
      (o) => o.status === "completed" && isWithin(o.completed_at ?? o.created_at, monthStart, now)
    )
  );
  const calls = excludeTestHarnessSessions(
    raw.callEvents.filter((e) => isWithin(e.started_at, monthStart, now))
  );

  const menuByRestaurant = new Map<string, MenuPriceContext>();
  if (raw.menu) menuByRestaurant.set(raw.restaurantId, raw.menu);
  const pricingByRestaurant = new Map([[raw.restaurantId, raw.pricing]]);

  const revenue = estimateRevenueCents(receipts, menuByRestaurant, pricingByRestaurant);
  const upsell = aggregateUpsellAttachStats(
    popularItemSources(completedOrders, receipts),
    raw.upsellRules,
    menuByRestaurant
  );

  return {
    revenueCents: revenue.totalCents ?? 0,
    revenueComplete: revenue.complete,
    ordersTaken: receipts.length,
    callsAnswered: calls.length,
    handledSeconds: sumCallDurationSeconds(calls),
    upsellRules: upsell.configuredRules,
    upsellAttachedOrders: upsell.attachedOrders,
    upsellRevenueCents: upsell.attributedRevenueCents ?? 0,
  };
}

export function computeOverviewSeries(
  raw: Pick<OverviewRawData, "receipts" | "callEvents">,
  dayKeys: string[],
  timeZone: string
): OverviewDayPoint[] {
  const calls = excludeTestHarnessSessions(raw.callEvents);
  const receipts = filterBillablePhoneOrderReceipts(raw.receipts);
  return buildDailySeries({
    dayKeys,
    timeZone,
    callStartedAt: calls.map((e) => e.started_at),
    orderCreatedAt: receipts.map((r) => r.created_at),
  });
}
