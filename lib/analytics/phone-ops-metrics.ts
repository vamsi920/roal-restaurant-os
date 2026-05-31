import { KDS_STUCK_THRESHOLD_MINUTES } from "@/lib/orders/kds-queue-lane";
import {
  isQueuedKitchenStatus,
  isTerminalOrderStatus,
} from "@/lib/order-status";
import { dayKeyUtc } from "@/lib/analytics/range";
import type {
  ConversionTrend,
  DailyOrderPoint,
  PeakCallWindowRow,
} from "@/lib/analytics/types";
import {
  conversionPercent,
  estimateRevenueCents,
  type AgentCallEventAnalyticsRow,
  type OrderRow,
  type ReceiptRow,
  type UsageRow,
} from "@/lib/analytics/aggregate";
import { computeOrderTotals } from "@/lib/orders/compute-order-totals";
import { parseOrderLineItems } from "@/lib/orders/line-items";
import type { MenuPriceContext } from "@/lib/orders/menu-price-context";
import type { OrderPricingSettings } from "@/lib/orders/pricing-settings";

export type OrderSessionRecord = {
  restaurantId: string;
  sessionId: string;
  firstActivityAt: string;
  lastActivityAt: string;
  hasReceipt: boolean;
  hasCompletedDraft: boolean;
  hasOrderCompletedUsage: boolean;
};

function sessionKey(restaurantId: string, sessionId: string): string {
  return `${restaurantId}:${sessionId}`;
}

function maxIso(a: string, b: string): string {
  return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
}

function minIso(a: string, b: string): string {
  return new Date(a).getTime() <= new Date(b).getTime() ? a : b;
}

export function collectOrderSessions(
  orders: OrderRow[],
  receipts: ReceiptRow[],
  usage: UsageRow[],
  restaurantIdSet: Set<string>
): Map<string, OrderSessionRecord> {
  const map = new Map<string, OrderSessionRecord>();

  const upsert = (
    restaurantId: string,
    sessionId: string,
    iso: string,
    patch: Partial<
      Pick<
        OrderSessionRecord,
        | "hasReceipt"
        | "hasCompletedDraft"
        | "hasOrderCompletedUsage"
      >
    >
  ) => {
    const sid = sessionId.trim();
    const rid = restaurantId.trim();
    if (!sid || !rid || !restaurantIdSet.has(rid)) return;

    const key = sessionKey(rid, sid);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        restaurantId: rid,
        sessionId: sid,
        firstActivityAt: iso,
        lastActivityAt: iso,
        hasReceipt: patch.hasReceipt ?? false,
        hasCompletedDraft: patch.hasCompletedDraft ?? false,
        hasOrderCompletedUsage: patch.hasOrderCompletedUsage ?? false,
      });
      return;
    }

    map.set(key, {
      ...existing,
      firstActivityAt: minIso(existing.firstActivityAt, iso),
      lastActivityAt: maxIso(existing.lastActivityAt, iso),
      hasReceipt: existing.hasReceipt || (patch.hasReceipt ?? false),
      hasCompletedDraft:
        existing.hasCompletedDraft || (patch.hasCompletedDraft ?? false),
      hasOrderCompletedUsage:
        existing.hasOrderCompletedUsage ||
        (patch.hasOrderCompletedUsage ?? false),
    });
  };

  for (const order of orders) {
    const iso = order.updated_at ?? order.created_at;
    upsert(order.restaurant_id, order.session_id, iso, {
      hasCompletedDraft: order.status === "completed",
    });
    upsert(order.restaurant_id, order.session_id, order.created_at, {});
  }

  for (const receipt of receipts) {
    upsert(receipt.restaurant_id, receipt.session_id, receipt.created_at, {
      hasReceipt: true,
    });
  }

  for (const row of usage) {
    if (!row.restaurant_id || !restaurantIdSet.has(row.restaurant_id)) continue;
    const sid = row.session_id?.trim();
    if (!sid) continue;
    upsert(row.restaurant_id, sid, row.occurred_at, {
      hasOrderCompletedUsage: row.event_type === "order_completed",
    });
    if (row.event_type === "voice_order" || row.event_type === "tool_call") {
      upsert(row.restaurant_id, sid, row.occurred_at, {});
    }
  }

  return map;
}

export function sessionHasCompletedOrder(session: OrderSessionRecord): boolean {
  return (
    session.hasReceipt ||
    session.hasCompletedDraft ||
    session.hasOrderCompletedUsage
  );
}

export function countStuckKitchenOrders(
  orders: OrderRow[],
  now: Date = new Date(),
  thresholdMinutes: number = KDS_STUCK_THRESHOLD_MINUTES
): number {
  const thresholdMs = thresholdMinutes * 60_000;
  let count = 0;
  for (const order of orders) {
    if (isTerminalOrderStatus(order.status)) continue;
    if (!isQueuedKitchenStatus(order.status)) continue;
    const updated = new Date(order.updated_at ?? order.created_at).getTime();
    if (Number.isNaN(updated)) continue;
    if (now.getTime() - updated >= thresholdMs) count += 1;
  }
  return count;
}

export function bucketOrderSessionsByDay(
  orders: OrderRow[],
  receipts: ReceiptRow[],
  usage: UsageRow[],
  dayKeys: string[],
  restaurantIdSet: Set<string>
): DailyOrderPoint[] {
  const sessionsByDay = new Map<string, Set<string>>();
  for (const key of dayKeys) {
    sessionsByDay.set(key, new Set());
  }

  const map = new Map(
    dayKeys.map((date) => [
      date,
      { date, orderSessions: 0, completed: 0, canceled: 0 },
    ])
  );

  const addSession = (day: string, restaurantId: string, sessionId: string) => {
    const set = sessionsByDay.get(day);
    if (!set) return;
    const key = sessionKey(restaurantId, sessionId);
    if (!set.has(key)) {
      set.add(key);
      const bucket = map.get(day);
      if (bucket) bucket.orderSessions += 1;
    }
  };

  for (const order of orders) {
    if (!restaurantIdSet.has(order.restaurant_id)) continue;
    addSession(dayKeyUtc(order.created_at), order.restaurant_id, order.session_id);
    if (order.status === "canceled") {
      const day = dayKeyUtc(order.canceled_at ?? order.created_at);
      const bucket = map.get(day);
      if (bucket) bucket.canceled += 1;
    }
  }

  for (const receipt of receipts) {
    if (!restaurantIdSet.has(receipt.restaurant_id)) continue;
    const day = dayKeyUtc(receipt.created_at);
    addSession(day, receipt.restaurant_id, receipt.session_id);
    const bucket = map.get(day);
    if (bucket) bucket.completed += 1;
  }

  for (const row of usage) {
    if (!row.restaurant_id || !restaurantIdSet.has(row.restaurant_id)) continue;
    const sid = row.session_id?.trim();
    if (!sid) continue;
    if (row.event_type === "order_completed") {
      const day = dayKeyUtc(row.occurred_at);
      addSession(day, row.restaurant_id, sid);
      const bucket = map.get(day);
      if (bucket) bucket.completed += 1;
    }
  }

  return dayKeys.map((key) => map.get(key)!);
}

const HOUR_LABELS = [
  "12 AM",
  "1 AM",
  "2 AM",
  "3 AM",
  "4 AM",
  "5 AM",
  "6 AM",
  "7 AM",
  "8 AM",
  "9 AM",
  "10 AM",
  "11 AM",
  "12 PM",
  "1 PM",
  "2 PM",
  "3 PM",
  "4 PM",
  "5 PM",
  "6 PM",
  "7 PM",
  "8 PM",
  "9 PM",
  "10 PM",
  "11 PM",
];

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function peakOrderHoursFromReceipts(
  receipts: ReceiptRow[],
  limit = 3
): import("@/lib/analytics/types").PeakHourRow[] {
  const counts = new Array(24).fill(0) as number[];
  for (const receipt of receipts) {
    const h = new Date(receipt.created_at).getUTCHours();
    if (Number.isFinite(h) && h >= 0 && h < 24) counts[h] += 1;
  }
  return counts
    .map((orderCount, hourUtc) => ({
      hourUtc,
      label: HOUR_LABELS[hourUtc] ?? `${hourUtc}:00 UTC`,
      orderCount,
    }))
    .filter((row) => row.orderCount > 0)
    .sort((a, b) => b.orderCount - a.orderCount)
    .slice(0, limit);
}

export function peakCallHoursFromEvents(
  events: AgentCallEventAnalyticsRow[],
  limit = 3
): import("@/lib/analytics/types").PeakHourRow[] {
  const counts = new Array(24).fill(0) as number[];
  for (const event of events) {
    const h = new Date(event.started_at).getUTCHours();
    if (Number.isFinite(h) && h >= 0 && h < 24) counts[h] += 1;
  }
  return counts
    .map((orderCount, hourUtc) => ({
      hourUtc,
      label: HOUR_LABELS[hourUtc] ?? `${hourUtc}:00 UTC`,
      orderCount,
    }))
    .filter((row) => row.orderCount > 0)
    .sort((a, b) => b.orderCount - a.orderCount)
    .slice(0, limit);
}

export function peakCallWindowsFromEvents(
  events: AgentCallEventAnalyticsRow[],
  limit = 6
): PeakCallWindowRow[] {
  const buckets = new Map<string, { callCount: number; completedCount: number }>();

  for (const event of events) {
    const started = new Date(event.started_at);
    const dayOfWeekUtc = started.getUTCDay();
    const hourUtc = started.getUTCHours();
    if (
      !Number.isFinite(dayOfWeekUtc) ||
      !Number.isFinite(hourUtc) ||
      dayOfWeekUtc < 0 ||
      dayOfWeekUtc > 6 ||
      hourUtc < 0 ||
      hourUtc > 23
    ) {
      continue;
    }

    const key = `${dayOfWeekUtc}:${hourUtc}`;
    const bucket = buckets.get(key) ?? { callCount: 0, completedCount: 0 };
    bucket.callCount += 1;
    if (event.outcome === "order_completed") bucket.completedCount += 1;
    buckets.set(key, bucket);
  }

  return [...buckets.entries()]
    .map(([key, bucket]) => {
      const [dayRaw, hourRaw] = key.split(":");
      const dayOfWeekUtc = Number(dayRaw);
      const hourUtc = Number(hourRaw);
      return {
        dayOfWeekUtc,
        dayLabel: DAY_LABELS[dayOfWeekUtc] ?? `Day ${dayOfWeekUtc}`,
        hourUtc,
        hourLabel: HOUR_LABELS[hourUtc] ?? `${hourUtc}:00 UTC`,
        callCount: bucket.callCount,
        completedCount: bucket.completedCount,
        conversionPercent: conversionPercent(
          bucket.completedCount,
          bucket.callCount
        ),
      };
    })
    .sort((a, b) => {
      if (b.callCount !== a.callCount) return b.callCount - a.callCount;
      if (b.completedCount !== a.completedCount) {
        return b.completedCount - a.completedCount;
      }
      if (a.dayOfWeekUtc !== b.dayOfWeekUtc) return a.dayOfWeekUtc - b.dayOfWeekUtc;
      return a.hourUtc - b.hourUtc;
    })
    .slice(0, limit);
}

export function computeSessionConversionTrend(
  sessions: OrderSessionRecord[],
  sinceIso: string,
  untilIso: string
): ConversionTrend {
  const sinceMs = new Date(sinceIso).getTime();
  const untilMs = new Date(untilIso).getTime();
  const midMs = sinceMs + (untilMs - sinceMs) / 2;

  let priorSessions = 0;
  let priorCompleted = 0;
  let recentSessions = 0;
  let recentCompleted = 0;

  for (const session of sessions.values()) {
    const anchor = new Date(session.firstActivityAt).getTime();
    if (Number.isNaN(anchor)) continue;
    const completed = sessionHasCompletedOrder(session);
    if (anchor < midMs) {
      priorSessions += 1;
      if (completed) priorCompleted += 1;
    } else {
      recentSessions += 1;
      if (completed) recentCompleted += 1;
    }
  }

  const priorPercent = conversionPercent(priorCompleted, priorSessions);
  const recentPercent = conversionPercent(recentCompleted, recentSessions);
  const deltaPoints =
    priorPercent != null && recentPercent != null
      ? recentPercent - priorPercent
      : null;

  return {
    label: "Later half vs earlier half of range",
    priorPercent,
    recentPercent,
    deltaPoints,
    priorSessions,
    recentSessions,
    priorCompleted,
    recentCompleted,
  };
}

export function averageOrderEstimateCents(
  completedOrders: OrderRow[],
  receipts: ReceiptRow[],
  menuByRestaurant: Map<string, MenuPriceContext>,
  pricingByRestaurant: Map<string, OrderPricingSettings>
): { avgCents: number | null; complete: boolean; sampleSize: number } {
  const revenue = estimateRevenueCents(
    completedOrders,
    menuByRestaurant,
    pricingByRestaurant
  );
  if (revenue.orderCount <= 0 || revenue.totalCents == null) {
    return {
      avgCents: null,
      complete: revenue.complete,
      sampleSize: 0,
    };
  }

  const seen = new Set<string>();
  const perOrderTotals: { cents: number | null; complete: boolean }[] = [];

  for (const order of completedOrders) {
    if (order.status !== "completed") continue;
    const key = sessionKey(order.restaurant_id, order.session_id);
    if (seen.has(key)) continue;
    seen.add(key);

    const menu = menuByRestaurant.get(order.restaurant_id);
    const pricing = pricingByRestaurant.get(order.restaurant_id);
    if (!menu || !pricing) continue;

    const totals = computeOrderTotals(
      parseOrderLineItems(order.items),
      menu,
      pricing
    );
    perOrderTotals.push({
      cents: totals.totalCents,
      complete: totals.complete,
    });
  }

  for (const receipt of receipts) {
    const key = sessionKey(receipt.restaurant_id, receipt.session_id);
    if (seen.has(key)) continue;
    seen.add(key);

    const menu = menuByRestaurant.get(receipt.restaurant_id);
    const pricing = pricingByRestaurant.get(receipt.restaurant_id);
    if (!menu || !pricing) continue;

    const totals = computeOrderTotals(
      parseOrderLineItems(receipt.items),
      menu,
      pricing
    );
    perOrderTotals.push({
      cents: totals.totalCents,
      complete: totals.complete,
    });
  }

  const priced = perOrderTotals.filter((row) => row.cents != null);
  if (priced.length === 0) {
    return { avgCents: null, complete: false, sampleSize: 0 };
  }

  const sum = priced.reduce((acc, row) => acc + (row.cents ?? 0), 0);
  const complete = priced.every((row) => row.complete);

  return {
    avgCents: Math.round(sum / priced.length),
    complete,
    sampleSize: priced.length,
  };
}
