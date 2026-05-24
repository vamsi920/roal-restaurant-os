import { describe, expect, it } from "vitest";
import {
  aggregateMenuScans,
  aggregatePopularItems,
  bucketUsageByDay,
  conversionPercent,
  popularItemSources,
  type OrderRow,
  type ReceiptRow,
  type UsageRow,
} from "@/lib/analytics/aggregate";

describe("conversionPercent", () => {
  it("returns null when no voice orders", () => {
    expect(conversionPercent(5, 0)).toBeNull();
  });

  it("caps at 100%", () => {
    expect(conversionPercent(12, 10)).toBe(100);
  });

  it("rounds ratio", () => {
    expect(conversionPercent(1, 3)).toBe(33);
  });
});

describe("bucketUsageByDay", () => {
  it("fills missing days with zeros", () => {
    const dayKeys = ["2026-05-17", "2026-05-18"];
    const events: UsageRow[] = [
      {
        event_type: "voice_order",
        occurred_at: "2026-05-17T12:00:00.000Z",
        restaurant_id: "r1",
        metadata: null,
      },
    ];
    const series = bucketUsageByDay(events, dayKeys);
    expect(series).toEqual([
      { date: "2026-05-17", voiceOrders: 1, completed: 0, canceled: 0 },
      { date: "2026-05-18", voiceOrders: 0, completed: 0, canceled: 0 },
    ]);
  });
});

describe("aggregateMenuScans", () => {
  it("skips usage rows tied to menu_imports", () => {
    const stats = aggregateMenuScans(
      [{ extraction_status: "extracted", created_at: "2026-05-01" }],
      [
        {
          event_type: "menu_scan",
          occurred_at: "2026-05-01",
          restaurant_id: null,
          metadata: { import_id: "imp-1", outcome: "extracted" },
        },
        {
          event_type: "menu_scan",
          occurred_at: "2026-05-01",
          restaurant_id: null,
          metadata: { outcome: "extraction_failed" },
        },
      ]
    );
    expect(stats).toEqual({
      attempts: 2,
      extracted: 1,
      committed: 0,
      failed: 1,
      successPercent: 50,
    });
  });
});

describe("popularItemSources", () => {
  const completed: OrderRow[] = [
    {
      restaurant_id: "r1",
      session_id: "s1",
      status: "completed",
      items: [{ name: "Burger", quantity: 2 }],
      created_at: "",
      completed_at: null,
      canceled_at: null,
    },
  ];
  const receipts: ReceiptRow[] = [
    {
      restaurant_id: "r1",
      session_id: "s1",
      items: [{ name: "Burger", quantity: 99 }],
      created_at: "",
    },
    {
      restaurant_id: "r1",
      session_id: "s2",
      items: [{ name: "Fries", quantity: 1 }],
      created_at: "",
    },
  ];

  it("dedupes receipt when completed order exists for session", () => {
    const sources = popularItemSources(completed, receipts);
    expect(sources).toHaveLength(2);
    const popular = aggregatePopularItems(sources);
    const burger = popular.find((p) => p.name === "Burger");
    expect(burger?.quantity).toBe(2);
  });
});
