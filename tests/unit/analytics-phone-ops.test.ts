import { describe, expect, it, vi } from "vitest";
import { loadOrganizationAnalytics } from "@/lib/analytics/load-analytics";
import {
  bucketOrderSessionsByDay,
  collectOrderSessions,
  computeSessionConversionTrend,
  countStuckKitchenOrders,
  sessionHasCompletedOrder,
} from "@/lib/analytics/phone-ops-metrics";
import type { OrderRow, ReceiptRow, UsageRow } from "@/lib/analytics/aggregate";

const RESTAURANT = "r1";

describe("collectOrderSessions", () => {
  it("unions session ids across drafts and receipts", () => {
    const map = collectOrderSessions(
      [
        {
          restaurant_id: RESTAURANT,
          session_id: "s1",
          status: "new",
          items: [],
          created_at: "2026-05-30T10:00:00.000Z",
          updated_at: "2026-05-30T10:05:00.000Z",
          completed_at: null,
          canceled_at: null,
        },
      ],
      [
        {
          restaurant_id: RESTAURANT,
          session_id: "s2",
          items: [],
          created_at: "2026-05-30T11:00:00.000Z",
        },
      ],
      [],
      new Set([RESTAURANT])
    );
    expect(map.size).toBe(2);
    expect(sessionHasCompletedOrder(map.get(`${RESTAURANT}:s2`)!)).toBe(true);
  });

  it("does not treat usage-only order_completed as completed session", () => {
    const map = collectOrderSessions(
      [],
      [],
      [
        {
          event_type: "order_completed",
          occurred_at: "2026-05-30T12:00:00.000Z",
          restaurant_id: RESTAURANT,
          session_id: "usage-only",
          metadata: null,
        },
      ],
      new Set([RESTAURANT])
    );
    const session = map.get(`${RESTAURANT}:usage-only`)!;
    expect(session.hasOrderCompletedUsage).toBe(true);
    expect(sessionHasCompletedOrder(session)).toBe(false);
  });

  it("excludes foreign restaurant rows from tenant scope", () => {
    const map = collectOrderSessions(
      [
        {
          restaurant_id: "foreign",
          session_id: "s1",
          status: "completed",
          items: [],
          created_at: "2026-05-30T10:00:00.000Z",
          updated_at: "2026-05-30T10:05:00.000Z",
          completed_at: null,
          canceled_at: null,
        },
      ],
      [],
      [],
      new Set([RESTAURANT])
    );
    expect(map.size).toBe(0);
  });
});

describe("countStuckKitchenOrders", () => {
  it("counts non-terminal queue rows idle past threshold", () => {
    const count = countStuckKitchenOrders(
      [
        {
          restaurant_id: RESTAURANT,
          session_id: "s1",
          status: "accepted",
          items: [],
          created_at: "2026-05-30T10:00:00.000Z",
          updated_at: "2026-05-30T10:00:00.000Z",
          completed_at: null,
          canceled_at: null,
        },
      ],
      new Date("2026-05-30T10:30:00.000Z"),
      20
    );
    expect(count).toBe(1);
  });
});

describe("computeSessionConversionTrend", () => {
  it("compares first and second half of range", () => {
    const sessions = collectOrderSessions(
      [],
      [
        {
          restaurant_id: RESTAURANT,
          session_id: "early",
          items: [],
          created_at: "2026-05-01T10:00:00.000Z",
        },
        {
          restaurant_id: RESTAURANT,
          session_id: "late",
          items: [],
          created_at: "2026-05-25T10:00:00.000Z",
        },
      ],
      [],
      new Set([RESTAURANT])
    );
    const trend = computeSessionConversionTrend(
      [...sessions.values()],
      "2026-05-01T00:00:00.000Z",
      "2026-05-30T23:59:59.000Z"
    );
    expect(trend.priorSessions).toBe(1);
    expect(trend.recentSessions).toBe(1);
    expect(trend.recentPercent).toBe(100);
  });
});

describe("bucketOrderSessionsByDay", () => {
  it("counts unique sessions per day", () => {
    const series = bucketOrderSessionsByDay(
      [],
      [
        {
          restaurant_id: RESTAURANT,
          session_id: "s1",
          items: [],
          created_at: "2026-05-17T12:00:00.000Z",
        },
      ],
      [] as UsageRow[],
      ["2026-05-17", "2026-05-18"],
      new Set([RESTAURANT])
    );
    expect(series[0]?.orderSessions).toBe(1);
    expect(series[0]?.completed).toBe(1);
    expect(series[1]?.orderSessions).toBe(0);
  });

  it("does not count usage-only order_completed as completed orders", () => {
    const series = bucketOrderSessionsByDay(
      [],
      [],
      [
        {
          event_type: "order_completed",
          occurred_at: "2026-05-17T12:00:00.000Z",
          restaurant_id: RESTAURANT,
          session_id: "usage-only",
          metadata: null,
        },
      ],
      ["2026-05-17"],
      new Set([RESTAURANT])
    );
    expect(series[0]?.orderSessions).toBe(1);
    expect(series[0]?.completed).toBe(0);
  });
});

describe("loadOrganizationAnalytics org rollup", () => {
  it("excludes inaccessible restaurants from org rollup", async () => {
    const REST_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const supabase = {
      from: vi.fn((table: string) => {
        const builder = {
          select: vi.fn(() => builder),
          eq: vi.fn(() => builder),
          in: vi.fn(() => builder),
          gte: vi.fn(() => builder),
          lte: vi.fn(() => builder),
          order: vi.fn(() => builder),
          then(
            onFulfilled?: (value: unknown) => unknown,
            onRejected?: (reason: unknown) => unknown
          ) {
            const data =
              table === "restaurants"
                ? [
                    { id: RESTAURANT, name: "Allowed" },
                    { id: REST_B, name: "Blocked" },
                  ]
                : table === "phone_order_receipts"
                  ? [
                      {
                        restaurant_id: RESTAURANT,
                        session_id: "s1",
                        items: [],
                        created_at: "2026-05-17T12:00:00.000Z",
                      },
                      {
                        restaurant_id: REST_B,
                        session_id: "s2",
                        items: [],
                        created_at: "2026-05-17T12:00:00.000Z",
                      },
                    ]
                  : [];
            return Promise.resolve({ data, error: null }).then(
              onFulfilled,
              onRejected
            );
          },
        };
        return builder;
      }),
    };

    const snapshot = await loadOrganizationAnalytics(supabase as never, {
      organizationId: "org-1",
      organizationName: "Org",
      accessibleRestaurantIds: [RESTAURANT],
    });

    expect(snapshot.restaurantCount).toBe(1);
    expect(snapshot.summary.ordersFinalized).toBe(1);
    expect(snapshot.byRestaurant).toHaveLength(1);
    expect(snapshot.byRestaurant[0]?.restaurantId).toBe(RESTAURANT);
  });

  it("returns honest empty snapshot when scoped restaurants missing", async () => {
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(function select() {
          return this;
        }),
        eq: vi.fn(function eq() {
          return this;
        }),
        order: vi.fn(function order() {
          return Promise.resolve({ data: [], error: null });
        }),
      })),
    };

    const snapshot = await loadOrganizationAnalytics(supabase as never, {
      organizationId: "org-1",
      organizationName: "Org",
      restaurantId: "missing",
    });

    expect(snapshot.summary.orderSessions).toBe(0);
    expect(snapshot.summary.revenueCents).toBeNull();
    expect(snapshot.summary.reservationRequests).toBe(0);
    expect(snapshot.summary.callOutcomes.total).toBe(0);
  });
});
