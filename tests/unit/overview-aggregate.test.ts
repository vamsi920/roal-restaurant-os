import { describe, expect, it } from "vitest";
import {
  areaPath,
  buildActivityItems,
  buildDailySeries,
  callDurationSeconds,
  chartPoints,
  firstNameFor,
  formatHandledDuration,
  formatLocalDayTime,
  lastDayKeys,
  maskCallerPhone,
  monthStartUtc,
  niceAxisMax,
  safeTimeZone,
  seriesStartUtc,
  sumCallDurationSeconds,
  zonedDayKey,
  type OverviewActivitySource,
} from "@/lib/overview/aggregate";
import { computeMonthStats, computeOverviewSeries } from "@/lib/overview/month-stats";
import { buildMenuPriceContext } from "@/lib/orders/menu-price-context";
import { DEFAULT_ORDER_PRICING } from "@/lib/orders/pricing-settings";
import type { DbItem } from "@/lib/types";

const CHICAGO = "America/Chicago";
const R = "rest-1";

describe("overview time zones", () => {
  it("falls back to UTC for unknown zones", () => {
    expect(safeTimeZone("Not/AZone")).toBe("UTC");
    expect(safeTimeZone("")).toBe("UTC");
    expect(safeTimeZone(CHICAGO)).toBe(CHICAGO);
  });

  it("computes the local calendar month start", () => {
    // Oct 27 2026 15:00 UTC = 10:00 CDT; month starts Oct 1 00:00 CDT = 05:00 UTC.
    const start = monthStartUtc(new Date("2026-10-27T15:00:00Z"), CHICAGO);
    expect(start.toISOString()).toBe("2026-10-01T05:00:00.000Z");
  });

  it("uses the local month near midnight UTC", () => {
    // Nov 1 2026 03:00 UTC is still Oct 31 in Chicago.
    const start = monthStartUtc(new Date("2026-11-01T03:00:00Z"), CHICAGO);
    expect(start.toISOString()).toBe("2026-10-01T05:00:00.000Z");
  });

  it("handles DST: December month start is CST (UTC-6)", () => {
    const start = monthStartUtc(new Date("2026-12-15T18:00:00Z"), CHICAGO);
    expect(start.toISOString()).toBe("2026-12-01T06:00:00.000Z");
  });

  it("keys days in the restaurant timezone", () => {
    expect(zonedDayKey("2026-10-27T03:30:00Z", CHICAGO)).toBe("2026-10-26");
    expect(zonedDayKey("2026-10-27T03:30:00Z", "UTC")).toBe("2026-10-27");
  });

  it("builds 14 day keys ending today and the window start", () => {
    const now = new Date("2026-10-27T15:00:00Z");
    const keys = lastDayKeys(now, CHICAGO, 14);
    expect(keys).toHaveLength(14);
    expect(keys[13]).toBe("2026-10-27");
    expect(keys[0]).toBe("2026-10-14");
    expect(seriesStartUtc(now, CHICAGO, 14).toISOString()).toBe("2026-10-14T05:00:00.000Z");
  });

  it("formats weekday and time locally", () => {
    expect(formatLocalDayTime(new Date("2026-10-23T21:11:00Z"), CHICAGO)).toBe("Friday 4:11 PM");
  });
});

describe("overview counting", () => {
  it("buckets calls and orders per local day", () => {
    const series = buildDailySeries({
      dayKeys: ["2026-10-26", "2026-10-27"],
      timeZone: CHICAGO,
      callStartedAt: ["2026-10-27T03:00:00Z", "2026-10-27T16:00:00Z", "2026-10-27T17:00:00Z"],
      orderCreatedAt: ["2026-10-27T16:05:00Z", "2026-09-01T00:00:00Z"],
    });
    expect(series).toEqual([
      { date: "2026-10-26", calls: 1, orders: 0 },
      { date: "2026-10-27", calls: 2, orders: 1 },
    ]);
  });

  it("reads call duration from metadata and ignores junk", () => {
    expect(callDurationSeconds({ call_duration_secs: 95 })).toBe(95);
    expect(callDurationSeconds({ call_duration_secs: "61.4" })).toBe(61);
    expect(callDurationSeconds({ call_duration_secs: -3 })).toBe(0);
    expect(callDurationSeconds({ call_duration_secs: 99999 })).toBe(0);
    expect(callDurationSeconds(null)).toBe(0);
    expect(
      sumCallDurationSeconds([
        { transcript_metadata: { call_duration_secs: 120 } },
        { transcript_metadata: {} },
        { transcript_metadata: { call_duration_secs: 60 } },
      ])
    ).toBe(180);
  });

  it("formats handled time honestly", () => {
    expect(formatHandledDuration(0)).toBe("0 min");
    expect(formatHandledDuration(45 * 60)).toBe("45 min");
    expect(formatHandledDuration(3 * 3600 + 20 * 60)).toBe("3 hr 20 min");
    expect(formatHandledDuration(2 * 3600)).toBe("2 hr");
    expect(formatHandledDuration(12.4 * 3600)).toBe("12 hr");
  });
});

describe("overview people", () => {
  it("masks caller phones", () => {
    expect(maskCallerPhone("+15125557437")).toBe("(512) •••-7437");
    expect(maskCallerPhone("512-555-7437")).toBe("(512) •••-7437");
    expect(maskCallerPhone("+447700900123")).toBe("•••0123");
    expect(maskCallerPhone(null)).toBe("Unknown caller");
    expect(maskCallerPhone("12")).toBe("Unknown caller");
  });

  it("derives a first name from the profile name or email", () => {
    expect(firstNameFor({ fullName: "mike marinara", email: "x@y.com" })).toBe("Mike");
    expect(firstNameFor({ fullName: null, email: "marinara.mike@loman.com" })).toBe("Marinara");
    expect(firstNameFor({ fullName: "owner@loman.com", email: null })).toBe("Owner");
    expect(firstNameFor({ email: "42@x.com" })).toBeNull();
  });
});

describe("overview recent activity", () => {
  const row = (over: Partial<OverviewActivitySource>): OverviewActivitySource => ({
    sessionId: "s",
    callerPhone: "+15125550000",
    callerName: null,
    status: "ended",
    outcome: "no_order",
    intentLabel: "Menu or info",
    totalLabel: null,
    needsStaffFollowUp: false,
    followUpReason: null,
    occurredAt: "2026-10-27T15:00:00Z",
    ...over,
  });

  it("classifies, pins live calls first, then newest first, and drops test calls", () => {
    const items = buildActivityItems([
      row({ sessionId: "old-call", occurredAt: "2026-10-27T10:00:00Z" }),
      row({ sessionId: "order", outcome: "order_completed", totalLabel: "$36.50", callerName: "Dana", occurredAt: "2026-10-27T14:00:00Z" }),
      row({ sessionId: "live", status: "active", outcome: "in_progress", occurredAt: "2026-10-27T09:00:00Z" }),
      row({ sessionId: "follow", needsStaffFollowUp: true, followUpReason: "Callback requested", occurredAt: "2026-10-27T13:00:00Z" }),
      row({ sessionId: "roal-harness-1", isTestHarness: true }),
    ]);
    expect(items.map((i) => [i.id, i.kind])).toEqual([
      ["live", "live"],
      ["order", "order"],
      ["follow", "followup"],
      ["old-call", "call"],
    ]);
    expect(items[1]).toMatchObject({ subtitle: "Dana", amountLabel: "$36.50", title: "(512) •••-0000" });
    expect(items[2].reason).toBe("Callback requested");
    expect(items[3].subtitle).toBe("Recent caller");
  });

  it("limits to 8 rows", () => {
    const rows = Array.from({ length: 12 }, (_, i) =>
      row({ sessionId: `s${i}`, occurredAt: new Date(Date.UTC(2026, 9, 27, i)).toISOString() })
    );
    const items = buildActivityItems(rows);
    expect(items).toHaveLength(8);
    expect(items[0].id).toBe("s11");
  });
});

describe("overview chart geometry", () => {
  it("rounds axis max to friendly numbers", () => {
    expect(niceAxisMax(0)).toBe(4);
    expect(niceAxisMax(7)).toBe(10);
    expect(niceAxisMax(13)).toBe(20);
    expect(niceAxisMax(42)).toBe(50);
    expect(niceAxisMax(120)).toBe(200);
  });

  it("maps values onto the box and closes the area", () => {
    const pts = chartPoints([0, 5, 10], { width: 100, height: 50, max: 10 });
    expect(pts).toEqual([
      [0, 50],
      [50, 25],
      [100, 0],
    ]);
    expect(areaPath(pts, 50)).toBe("M0 50 L50 25 L100 0 L100 50 L0 50 Z");
  });
});

describe("overview month stats", () => {
  const item = (name: string, price: number): DbItem =>
    ({ id: name, category_id: "c", name, price, description: null, is_available: true }) as unknown as DbItem;
  const menu = buildMenuPriceContext([item("Pepperoni Pizza", 18), item("Garlic Knots", 6)], []);
  const monthStart = new Date("2026-10-01T05:00:00Z");
  const now = new Date("2026-10-27T15:00:00Z");

  it("counts this month only, skips test sessions, and estimates revenue from menu prices", () => {
    const stats = computeMonthStats(
      {
        restaurantId: R,
        receipts: [
          { restaurant_id: R, session_id: "a", items: [{ name: "Pepperoni Pizza", quantity: 2 }], created_at: "2026-10-20T18:00:00Z" },
          { restaurant_id: R, session_id: "b", items: [{ name: "Garlic Knots", quantity: 1 }], created_at: "2026-10-21T18:00:00Z" },
          { restaurant_id: R, session_id: "old", items: [{ name: "Garlic Knots", quantity: 1 }], created_at: "2026-09-30T18:00:00Z" },
          { restaurant_id: R, session_id: "roal-harness-x", items: [{ name: "Garlic Knots", quantity: 1 }], created_at: "2026-10-21T18:00:00Z" },
        ],
        completedOrders: [],
        callEvents: [
          { restaurant_id: R, session_id: "a", status: "ended", outcome: "order_completed", started_at: "2026-10-20T17:58:00Z", ended_at: null, transcript_metadata: { call_duration_secs: 120 } },
          { restaurant_id: R, session_id: "c", status: "ended", outcome: "no_order", started_at: "2026-10-22T17:58:00Z", ended_at: null, transcript_metadata: { call_duration_secs: 60 } },
          { restaurant_id: R, session_id: "prev", status: "ended", outcome: "no_order", started_at: "2026-09-22T17:58:00Z", ended_at: null, transcript_metadata: { call_duration_secs: 600 } },
        ],
        upsellRules: [],
        menu,
        pricing: { ...DEFAULT_ORDER_PRICING, taxRatePercent: 0, serviceFeePercent: 0 },
      },
      monthStart,
      now
    );
    expect(stats.ordersTaken).toBe(2);
    expect(stats.callsAnswered).toBe(2);
    expect(stats.handledSeconds).toBe(180);
    expect(stats.revenueCents).toBe(4200);
    expect(stats.revenueComplete).toBe(true);
    expect(stats.upsellRules).toBe(0);
    expect(stats.upsellRevenueCents).toBe(0);
  });

  it("returns zeros for an empty location", () => {
    const stats = computeMonthStats(
      { restaurantId: R, receipts: [], completedOrders: [], callEvents: [], upsellRules: [], menu: null, pricing: DEFAULT_ORDER_PRICING },
      monthStart,
      now
    );
    expect(stats).toMatchObject({ revenueCents: 0, ordersTaken: 0, callsAnswered: 0, handledSeconds: 0, upsellRevenueCents: 0 });
  });

  it("builds the 14-day series excluding test sessions", () => {
    const series = computeOverviewSeries(
      {
        receipts: [{ restaurant_id: R, session_id: "a", items: [{ name: "Garlic Knots", quantity: 1 }], created_at: "2026-10-27T16:00:00Z" }],
        callEvents: [
          { restaurant_id: R, session_id: "a", status: "ended", outcome: "order_completed", started_at: "2026-10-27T15:58:00Z", ended_at: null },
          { restaurant_id: R, session_id: "roal-harness-2", status: "ended", outcome: "no_order", started_at: "2026-10-27T15:00:00Z", ended_at: null },
        ],
      },
      lastDayKeys(now, CHICAGO, 14),
      CHICAGO
    );
    expect(series).toHaveLength(14);
    expect(series[13]).toEqual({ date: "2026-10-27", calls: 1, orders: 1 });
    expect(series.slice(0, 13).every((p) => p.calls === 0 && p.orders === 0)).toBe(true);
  });
});
