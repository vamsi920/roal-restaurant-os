import { computeOrderTotals } from "@/lib/orders/compute-order-totals";
import { parseOrderLineItems } from "@/lib/orders/line-items";
import type { MenuPriceContext } from "@/lib/orders/menu-price-context";
import { buildMenuPriceContext } from "@/lib/orders/menu-price-context";
import type { OrderPricingSettings } from "@/lib/orders/pricing-settings";
import type {
  DailyOrderPoint,
  MenuScanStats,
  PopularItemRow,
} from "@/lib/analytics/types";
import { dayKeyUtc } from "@/lib/analytics/range";
import type { DbItem, DbModifier } from "@/lib/types";

export type UsageRow = {
  event_type: string;
  occurred_at: string;
  restaurant_id: string | null;
  metadata: Record<string, unknown> | null;
};

export type OrderRow = {
  restaurant_id: string;
  session_id: string;
  status: string;
  items: unknown;
  created_at: string;
  completed_at: string | null;
  canceled_at: string | null;
};

export type ReceiptRow = {
  restaurant_id: string;
  session_id: string;
  items: unknown;
  created_at: string;
};

export type MenuImportRow = {
  extraction_status: string;
  created_at: string;
};

export function bucketUsageByDay(
  events: UsageRow[],
  dayKeys: string[]
): DailyOrderPoint[] {
  const map = new Map<string, DailyOrderPoint>();
  for (const key of dayKeys) {
    map.set(key, { date: key, voiceOrders: 0, completed: 0, canceled: 0 });
  }

  for (const row of events) {
    const key = dayKeyUtc(row.occurred_at);
    const bucket = map.get(key);
    if (!bucket) continue;
    if (row.event_type === "voice_order") bucket.voiceOrders += 1;
    if (row.event_type === "order_completed") bucket.completed += 1;
  }

  return dayKeys.map((key) => map.get(key)!);
}

export function applyCanceledOrdersToSeries(
  series: DailyOrderPoint[],
  orders: OrderRow[]
): DailyOrderPoint[] {
  const map = new Map(series.map((p) => [p.date, { ...p }]));
  for (const order of orders) {
    if (order.status !== "canceled") continue;
    const at = order.canceled_at ?? order.created_at;
    const key = dayKeyUtc(at);
    const bucket = map.get(key);
    if (bucket) bucket.canceled += 1;
  }
  return series.map((point) => map.get(point.date)!);
}

export function countUsageByRestaurant(
  events: UsageRow[],
  restaurantIds: Set<string>
): Map<string, { voice: number; completed: number }> {
  const map = new Map<string, { voice: number; completed: number }>();
  for (const id of restaurantIds) {
    map.set(id, { voice: 0, completed: 0 });
  }
  for (const row of events) {
    if (!row.restaurant_id || !restaurantIds.has(row.restaurant_id)) continue;
    const entry = map.get(row.restaurant_id)!;
    if (row.event_type === "voice_order") entry.voice += 1;
    if (row.event_type === "order_completed") entry.completed += 1;
  }
  return map;
}

export function countCanceledByRestaurant(orders: OrderRow[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const order of orders) {
    if (order.status !== "canceled") continue;
    map.set(order.restaurant_id, (map.get(order.restaurant_id) ?? 0) + 1);
  }
  return map;
}

export function countReceiptsByRestaurant(
  receipts: ReceiptRow[]
): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of receipts) {
    map.set(row.restaurant_id, (map.get(row.restaurant_id) ?? 0) + 1);
  }
  return map;
}

export function aggregatePopularItems(
  sources: Array<{ items: unknown }>,
  limit = 10
): PopularItemRow[] {
  const qty = new Map<string, number>();
  const orders = new Map<string, Set<string>>();

  let orderIndex = 0;
  for (const source of sources) {
    const lines = parseOrderLineItems(source.items);
    const orderKey = `o-${orderIndex++}`;
    for (const line of lines) {
      const key = line.name.trim() || "Item";
      qty.set(key, (qty.get(key) ?? 0) + line.quantity);
      if (!orders.has(key)) orders.set(key, new Set());
      orders.get(key)!.add(orderKey);
    }
  }

  return [...qty.entries()]
    .map(([name, quantity]) => ({
      name,
      quantity,
      orderCount: orders.get(name)?.size ?? 0,
    }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, limit);
}

export function averagePrepMinutes(orders: OrderRow[]): {
  avg: number | null;
  sampleSize: number;
} {
  const samples: number[] = [];
  for (const order of orders) {
    if (order.status !== "completed" || !order.completed_at) continue;
    const start = new Date(order.created_at).getTime();
    const end = new Date(order.completed_at).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
    samples.push((end - start) / 60_000);
  }
  if (samples.length === 0) return { avg: null, sampleSize: 0 };
  const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
  return { avg: Math.round(avg * 10) / 10, sampleSize: samples.length };
}

export function prepMinutesByRestaurant(
  orders: OrderRow[]
): Map<string, { avg: number | null; sampleSize: number }> {
  const byRestaurant = new Map<string, OrderRow[]>();
  for (const order of orders) {
    if (order.status !== "completed") continue;
    const list = byRestaurant.get(order.restaurant_id) ?? [];
    list.push(order);
    byRestaurant.set(order.restaurant_id, list);
  }
  const result = new Map<string, { avg: number | null; sampleSize: number }>();
  for (const [id, list] of byRestaurant) {
    result.set(id, averagePrepMinutes(list));
  }
  return result;
}

export function aggregateMenuScans(
  imports: MenuImportRow[],
  usageScans: UsageRow[]
): MenuScanStats {
  let extracted = 0;
  let committed = 0;
  let failed = 0;

  for (const row of imports) {
    if (row.extraction_status === "extracted") extracted += 1;
    if (row.extraction_status === "committed") committed += 1;
    if (row.extraction_status === "extraction_failed") failed += 1;
  }

  for (const row of usageScans) {
    if (row.event_type !== "menu_scan") continue;
    const importId = row.metadata?.import_id;
    if (typeof importId === "string" && importId.trim()) {
      continue;
    }
    const outcome = row.metadata?.outcome;
    if (outcome === "extracted") extracted += 1;
    if (outcome === "extraction_failed") failed += 1;
  }

  const attempts = extracted + committed + failed;
  const success = extracted + committed;
  const denom = success + failed;
  return {
    attempts,
    extracted,
    committed,
    failed,
    successPercent: denom > 0 ? Math.round((success / denom) * 100) : null,
  };
}

export function estimateRevenueCents(
  orders: OrderRow[],
  menuByRestaurant: Map<string, MenuPriceContext>,
  pricingByRestaurant: Map<string, OrderPricingSettings>
): { totalCents: number | null; complete: boolean; orderCount: number } {
  let totalCents = 0;
  let complete = true;
  let orderCount = 0;

  for (const order of orders) {
    if (order.status !== "completed") continue;
    const menu = menuByRestaurant.get(order.restaurant_id);
    const pricing = pricingByRestaurant.get(order.restaurant_id);
    if (!menu || !pricing) continue;

    const lines = parseOrderLineItems(order.items);
    if (lines.length === 0) continue;

    const totals = computeOrderTotals(lines, menu, pricing);
    orderCount += 1;
    if (totals.totalCents == null) {
      complete = false;
      continue;
    }
    totalCents += totals.totalCents;
  }

  return {
    totalCents: orderCount > 0 ? totalCents : null,
    complete,
    orderCount,
  };
}

export function buildMenuContexts(
  items: DbItem[],
  modifiers: DbModifier[],
  restaurantIds: string[],
  categoryRestaurantMap: Map<string, string>
): Map<string, MenuPriceContext> {
  const itemsByRestaurant = new Map<string, DbItem[]>();
  for (const item of items) {
    const restaurantId = categoryRestaurantMap.get(item.category_id);
    if (!restaurantId) continue;
    const list = itemsByRestaurant.get(restaurantId) ?? [];
    list.push(item);
    itemsByRestaurant.set(restaurantId, list);
  }

  const modsByRestaurant = new Map<string, DbModifier[]>();
  for (const mod of modifiers) {
    const item = items.find((i) => i.id === mod.item_id);
    if (!item) continue;
    const restaurantId = categoryRestaurantMap.get(item.category_id);
    if (!restaurantId) continue;
    const list = modsByRestaurant.get(restaurantId) ?? [];
    list.push(mod);
    modsByRestaurant.set(restaurantId, list);
  }

  const contexts = new Map<string, MenuPriceContext>();
  for (const id of restaurantIds) {
    contexts.set(
      id,
      buildMenuPriceContext(
        itemsByRestaurant.get(id) ?? [],
        modsByRestaurant.get(id) ?? []
      )
    );
  }
  return contexts;
}

export function conversionPercent(
  completed: number,
  voice: number
): number | null {
  if (voice <= 0) return null;
  return Math.min(100, Math.round((completed / voice) * 100));
}

/** Prefer completed kitchen orders; add receipts only for sessions without a completed row. */
export function popularItemSources(
  completedOrders: OrderRow[],
  receipts: ReceiptRow[]
): Array<{ items: unknown }> {
  const seen = new Set<string>();
  const sources: Array<{ items: unknown }> = [];

  for (const order of completedOrders) {
    seen.add(`${order.restaurant_id}:${order.session_id}`);
    sources.push({ items: order.items });
  }

  for (const receipt of receipts) {
    const key = `${receipt.restaurant_id}:${receipt.session_id}`;
    if (seen.has(key)) continue;
    sources.push({ items: receipt.items });
  }

  return sources;
}
