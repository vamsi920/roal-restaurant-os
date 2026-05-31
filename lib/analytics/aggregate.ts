import {
  isVoicemailTranscriptMetadata,
  outcomeForVoicemailAwareCall,
} from "@/lib/agent-calls/voicemail-call";
import { followUpLabelFromHandoffMetadata } from "@/lib/elevenlabs/handoff-metadata";
import { computeOrderTotals } from "@/lib/orders/compute-order-totals";
import { parseOrderLineItems } from "@/lib/orders/line-items";
import type { MenuPriceContext } from "@/lib/orders/menu-price-context";
import { buildMenuPriceContext } from "@/lib/orders/menu-price-context";
import type { OrderPricingSettings } from "@/lib/orders/pricing-settings";
import { upsellOutcomeCounts } from "@/lib/restaurant-upsell/analytics-signals";
import { getUpsellExperimentVariant } from "@/lib/restaurant-upsell/experiment";
import type {
  CallOutcomeStats,
  DailyOrderPoint,
  MenuScanStats,
  PopularItemRow,
  UpsellAttachStats,
} from "@/lib/analytics/types";
import { dayKeyUtc } from "@/lib/analytics/range";
import type { DbItem, DbModifier } from "@/lib/types";

export type UsageRow = {
  event_type: string;
  occurred_at: string;
  restaurant_id: string | null;
  session_id: string | null;
  metadata: Record<string, unknown> | null;
};

export type OrderRow = {
  restaurant_id: string;
  session_id: string;
  status: string;
  items: unknown;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  canceled_at: string | null;
};

export type ReceiptRow = {
  restaurant_id: string;
  session_id: string;
  items: unknown;
  created_at: string;
};

export type UpsellRuleAnalyticsRow = {
  restaurant_id: string;
  trigger_text: string;
  offer_text: string;
  is_active: boolean;
};

export type AgentCallEventAnalyticsRow = {
  restaurant_id: string;
  session_id?: string | null;
  status: string;
  outcome: string;
  started_at: string;
  ended_at: string | null;
  transcript_metadata?: Record<string, unknown> | null;
};

export function receiptSessionKey(
  restaurantId: string,
  sessionId: string
): string {
  return `${restaurantId}:${sessionId.trim()}`;
}

export function buildReceiptSessionKeys(receipts: ReceiptRow[]): Set<string> {
  const keys = new Set<string>();
  for (const receipt of receipts) {
    const sessionId = receipt.session_id?.trim();
    if (!sessionId) continue;
    keys.add(receiptSessionKey(receipt.restaurant_id, sessionId));
  }
  return keys;
}

export function callEventReceiptSessionKey(
  event: AgentCallEventAnalyticsRow
): string | null {
  const sessionId = event.session_id?.trim();
  if (!sessionId) return null;
  return receiptSessionKey(event.restaurant_id, sessionId);
}

function callMetadata(
  event: AgentCallEventAnalyticsRow
): Record<string, unknown> {
  return event.transcript_metadata ?? {};
}

function isTruthyFlag(value: unknown): boolean {
  return value === true || String(value).trim().toLowerCase() === "true";
}

function isCallbackMetadata(metadata: Record<string, unknown>): boolean {
  if (isTruthyFlag(metadata.callback_requested)) return true;
  return followUpLabelFromHandoffMetadata(metadata) === "Callback requested";
}

export function classifyCallFollowUp(
  metadata: Record<string, unknown>
): "voicemail" | "callback" | "handoff" | null {
  if (
    isVoicemailTranscriptMetadata(metadata) ||
    isTruthyFlag(metadata.voicemail_detected)
  ) {
    return "voicemail";
  }
  if (isCallbackMetadata(metadata)) return "callback";
  const label = followUpLabelFromHandoffMetadata(metadata);
  if (!label || label === "Voicemail left" || label === "Callback requested") {
    return null;
  }
  return "handoff";
}

export function resolveAnalyticsCallOutcome(
  event: AgentCallEventAnalyticsRow,
  receiptSessionKeys: Set<string>
): string {
  const metadata = callMetadata(event);
  const sessionKey = callEventReceiptSessionKey(event);
  const hasReceipt =
    sessionKey != null && receiptSessionKeys.has(sessionKey);

  let outcome = event.outcome;
  if (outcome === "order_completed" && !hasReceipt) {
    outcome = "no_order";
  }

  return outcomeForVoicemailAwareCall({
    transcriptMetadata: metadata,
    receipt: hasReceipt ? { session_id: event.session_id!.trim() } : null,
    inferredOutcome: outcome,
  });
}

export type MenuImportRow = {
  extraction_status: string;
  created_at: string;
};

/** @deprecated Prefer bucketOrderSessionsByDay in phone-ops-metrics. */
export function bucketUsageByDay(
  events: UsageRow[],
  dayKeys: string[]
): DailyOrderPoint[] {
  const map = new Map<string, DailyOrderPoint>();
  for (const key of dayKeys) {
    map.set(key, { date: key, orderSessions: 0, completed: 0, canceled: 0 });
  }

  for (const row of events) {
    const key = dayKeyUtc(row.occurred_at);
    const bucket = map.get(key);
    if (!bucket) continue;
    if (row.event_type === "voice_order") bucket.orderSessions += 1;
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

export function emptyCallOutcomeStats(): CallOutcomeStats {
  return {
    total: 0,
    active: 0,
    completed: 0,
    noOrder: 0,
    abandoned: 0,
    canceled: 0,
    unknown: 0,
    voicemailOrCallback: 0,
    handoff: 0,
  };
}

export function aggregateCallOutcomes(
  events: AgentCallEventAnalyticsRow[],
  receiptSessionKeys: Set<string> = new Set()
): CallOutcomeStats {
  const stats = emptyCallOutcomeStats();
  for (const event of events) {
    stats.total += 1;
    if (event.status === "active" || event.outcome === "in_progress") {
      stats.active += 1;
    }

    const followUp = classifyCallFollowUp(callMetadata(event));
    if (followUp === "voicemail" || followUp === "callback") {
      stats.voicemailOrCallback += 1;
    } else if (followUp === "handoff") {
      stats.handoff += 1;
    }

    switch (resolveAnalyticsCallOutcome(event, receiptSessionKeys)) {
      case "order_completed":
        stats.completed += 1;
        break;
      case "no_order":
        stats.noOrder += 1;
        break;
      case "abandoned":
        stats.abandoned += 1;
        break;
      case "canceled":
        stats.canceled += 1;
        break;
      case "unknown":
        stats.unknown += 1;
        break;
      default:
        break;
    }
  }
  return stats;
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

function normalizedTokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 3);
}

function textMatchesLine(ruleText: string, lineName: string): boolean {
  const ruleTokens = normalizedTokens(ruleText);
  const lineTokens = normalizedTokens(lineName);
  if (ruleTokens.length === 0 || lineTokens.length === 0) return false;
  const ruleSet = new Set(ruleTokens);
  const lineSet = new Set(lineTokens);
  const lineInRule = lineTokens.every((token) => ruleSet.has(token));
  const ruleInLine = ruleTokens.every((token) => lineSet.has(token));
  return lineInRule || ruleInLine;
}

export function aggregateUpsellAttachStats(
  sources: Array<{ restaurant_id: string; session_id: string; items: unknown }>,
  rules: UpsellRuleAnalyticsRow[],
  menuByRestaurant: Map<string, MenuPriceContext> = new Map()
): UpsellAttachStats {
  const activeRules = rules.filter((rule) => rule.is_active !== false);
  if (activeRules.length === 0) {
    return {
      configuredRules: 0,
      eligibleOrders: 0,
      attachedOrders: 0,
      skippedOrders: 0,
      attachPercent: null,
      attributedRevenueCents: null,
      revenueComplete: true,
      averageRevenuePerAttachedOrderCents: null,
      attachedAverageOrderCents: null,
      unattachedAverageOrderCents: null,
      observedTicketLiftCents: null,
      observedTicketLiftPercent: null,
      observedLiftComplete: true,
      attachedLiftSampleSize: 0,
      unattachedLiftSampleSize: 0,
      experimentTreatmentOrders: 0,
      experimentControlOrders: 0,
      experimentTreatmentAverageOrderCents: null,
      experimentControlAverageOrderCents: null,
      experimentTicketLiftCents: null,
      experimentTicketLiftPercent: null,
      experimentLiftComplete: true,
    };
  }

  const eligible = new Set<string>();
  const attached = new Set<string>();
  let attributedRevenueCents = 0;
  let pricedOfferLineCount = 0;
  let revenueComplete = true;
  let attachedSubtotalCents = 0;
  let attachedSubtotalSamples = 0;
  let unattachedSubtotalCents = 0;
  let unattachedSubtotalSamples = 0;
  let observedLiftComplete = true;
  let experimentTreatmentSubtotalCents = 0;
  let experimentTreatmentSamples = 0;
  let experimentControlSubtotalCents = 0;
  let experimentControlSamples = 0;
  let experimentLiftComplete = true;
  const rulesByRestaurant = new Map<string, UpsellRuleAnalyticsRow[]>();
  for (const rule of activeRules) {
    const list = rulesByRestaurant.get(rule.restaurant_id) ?? [];
    list.push(rule);
    rulesByRestaurant.set(rule.restaurant_id, list);
  }

  for (const source of sources) {
    const restaurantRules = rulesByRestaurant.get(source.restaurant_id) ?? [];
    if (restaurantRules.length === 0) continue;
    const lines = parseOrderLineItems(source.items);
    if (lines.length === 0) continue;
    const names = lines.map((line) => line.name).filter(Boolean);
    const orderKey = `${source.restaurant_id}:${source.session_id}`;
    const menu = menuByRestaurant.get(source.restaurant_id) ?? null;
    const priced = menu
      ? computeOrderTotals(lines, menu).lines
      : lines.map((line) => ({
          name: line.name,
          lineTotalCents:
            line.unitPrice == null
              ? null
              : Math.round(line.unitPrice * 100) * line.quantity,
        }));
    const countedOfferLines = new Set<number>();
    let orderEligible = false;
    let orderAttached = false;

    for (const rule of restaurantRules) {
      const triggerMatched = names.some((name) =>
        textMatchesLine(rule.trigger_text, name)
      );
      if (!triggerMatched) continue;
      eligible.add(orderKey);
      orderEligible = true;
      let offerAttached = false;
      names.forEach((name, index) => {
        if (!textMatchesLine(rule.offer_text, name)) return;
        offerAttached = true;
        if (countedOfferLines.has(index)) return;
        countedOfferLines.add(index);
        const lineTotalCents = priced[index]?.lineTotalCents;
        if (lineTotalCents == null) {
          revenueComplete = false;
        } else {
          pricedOfferLineCount += 1;
          attributedRevenueCents += lineTotalCents;
        }
      });
      if (offerAttached) {
        attached.add(orderKey);
        orderAttached = true;
      }
    }

    if (orderEligible) {
      const totals = menu ? computeOrderTotals(lines, menu) : null;
      let subtotalCents: number | null = totals?.subtotalCents ?? null;
      if (totals && !totals.complete) observedLiftComplete = false;

      if (!menu) {
        let sum = 0;
        let complete = true;
        for (const line of lines) {
          if (line.unitPrice == null) {
            complete = false;
            continue;
          }
          sum += Math.round(line.unitPrice * 100) * line.quantity;
        }
        subtotalCents = sum > 0 ? sum : null;
        if (!complete) observedLiftComplete = false;
      }

      if (subtotalCents == null) {
        observedLiftComplete = false;
        experimentLiftComplete = false;
      } else if (orderAttached) {
        attachedSubtotalSamples += 1;
        attachedSubtotalCents += subtotalCents;
      } else {
        unattachedSubtotalSamples += 1;
        unattachedSubtotalCents += subtotalCents;
      }

      if (subtotalCents != null) {
        const variant = getUpsellExperimentVariant(
          source.restaurant_id,
          source.session_id
        );
        if (variant === "control") {
          experimentControlSamples += 1;
          experimentControlSubtotalCents += subtotalCents;
        } else {
          experimentTreatmentSamples += 1;
          experimentTreatmentSubtotalCents += subtotalCents;
        }
      }
    }
  }

  const eligibleOrders = eligible.size;
  const attachedOrders = attached.size;
  const skippedOrders = upsellOutcomeCounts({
    eligibleOrders,
    attachedOrders,
  }).skipped;
  const attachedAverageOrderCents =
    attachedSubtotalSamples > 0
      ? Math.round(attachedSubtotalCents / attachedSubtotalSamples)
      : null;
  const unattachedAverageOrderCents =
    unattachedSubtotalSamples > 0
      ? Math.round(unattachedSubtotalCents / unattachedSubtotalSamples)
      : null;
  const observedTicketLiftCents =
    attachedAverageOrderCents != null && unattachedAverageOrderCents != null
      ? attachedAverageOrderCents - unattachedAverageOrderCents
      : null;
  const observedTicketLiftPercent =
    observedTicketLiftCents != null &&
    unattachedAverageOrderCents != null &&
    unattachedAverageOrderCents > 0
      ? Math.round((observedTicketLiftCents / unattachedAverageOrderCents) * 100)
      : null;
  const experimentTreatmentAverageOrderCents =
    experimentTreatmentSamples > 0
      ? Math.round(experimentTreatmentSubtotalCents / experimentTreatmentSamples)
      : null;
  const experimentControlAverageOrderCents =
    experimentControlSamples > 0
      ? Math.round(experimentControlSubtotalCents / experimentControlSamples)
      : null;
  const experimentTicketLiftCents =
    experimentTreatmentAverageOrderCents != null &&
    experimentControlAverageOrderCents != null
      ? experimentTreatmentAverageOrderCents - experimentControlAverageOrderCents
      : null;
  const experimentTicketLiftPercent =
    experimentTicketLiftCents != null &&
    experimentControlAverageOrderCents != null &&
    experimentControlAverageOrderCents > 0
      ? Math.round((experimentTicketLiftCents / experimentControlAverageOrderCents) * 100)
      : null;

  return {
    configuredRules: activeRules.length,
    eligibleOrders,
    attachedOrders,
    skippedOrders,
    attachPercent: conversionPercent(attachedOrders, eligibleOrders),
    attributedRevenueCents:
      attachedOrders > 0 && pricedOfferLineCount > 0
        ? attributedRevenueCents
        : null,
    revenueComplete,
    averageRevenuePerAttachedOrderCents:
      attachedOrders > 0 && pricedOfferLineCount > 0
        ? Math.round(attributedRevenueCents / attachedOrders)
        : null,
    attachedAverageOrderCents,
    unattachedAverageOrderCents,
    observedTicketLiftCents,
    observedTicketLiftPercent,
    observedLiftComplete,
    attachedLiftSampleSize: attachedSubtotalSamples,
    unattachedLiftSampleSize: unattachedSubtotalSamples,
    experimentTreatmentOrders: experimentTreatmentSamples,
    experimentControlOrders: experimentControlSamples,
    experimentTreatmentAverageOrderCents,
    experimentControlAverageOrderCents,
    experimentTicketLiftCents,
    experimentTicketLiftPercent,
    experimentLiftComplete,
  };
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
  receipts: ReceiptRow[],
  menuByRestaurant: Map<string, MenuPriceContext>,
  pricingByRestaurant: Map<string, OrderPricingSettings>
): { totalCents: number | null; complete: boolean; orderCount: number } {
  let totalCents = 0;
  let complete = true;
  let orderCount = 0;
  const seen = new Set<string>();

  for (const receipt of receipts) {
    const sessionId = receipt.session_id?.trim();
    if (!sessionId) continue;
    const key = receiptSessionKey(receipt.restaurant_id, sessionId);
    if (seen.has(key)) continue;
    seen.add(key);

    const menu = menuByRestaurant.get(receipt.restaurant_id);
    const pricing = pricingByRestaurant.get(receipt.restaurant_id);
    if (!menu || !pricing) continue;

    const lines = parseOrderLineItems(receipt.items);
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
): Array<{ restaurant_id: string; session_id: string; items: unknown }> {
  const seen = new Set<string>();
  const sources: Array<{ restaurant_id: string; session_id: string; items: unknown }> = [];

  for (const order of completedOrders) {
    seen.add(`${order.restaurant_id}:${order.session_id}`);
    sources.push({
      restaurant_id: order.restaurant_id,
      session_id: order.session_id,
      items: order.items,
    });
  }

  for (const receipt of receipts) {
    const key = `${receipt.restaurant_id}:${receipt.session_id}`;
    if (seen.has(key)) continue;
    sources.push({
      restaurant_id: receipt.restaurant_id,
      session_id: receipt.session_id,
      items: receipt.items,
    });
  }

  return sources;
}
