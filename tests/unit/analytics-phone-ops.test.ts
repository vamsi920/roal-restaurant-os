import { describe, expect, it } from "vitest";
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
    expect(series[1]?.orderSessions).toBe(0);
  });
});
