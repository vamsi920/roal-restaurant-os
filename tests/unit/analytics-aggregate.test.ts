import { describe, expect, it } from "vitest";
import {
  aggregateMenuScans,
  aggregateCallOutcomes,
  aggregatePopularItems,
  aggregateUpsellAttachStats,
  bucketUsageByDay,
  conversionPercent,
  popularItemSources,
  type OrderRow,
  type ReceiptRow,
  type UsageRow,
} from "@/lib/analytics/aggregate";
import {
  peakCallHoursFromEvents,
  peakCallWindowsFromEvents,
} from "@/lib/analytics/phone-ops-metrics";
import { buildMenuPriceContext } from "@/lib/orders/menu-price-context";
import { getUpsellExperimentVariant } from "@/lib/restaurant-upsell/experiment";

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

describe("aggregateUpsellAttachStats", () => {
  it("counts eligible and attached orders from configured rules", () => {
    const stats = aggregateUpsellAttachStats(
      [
        {
          restaurant_id: "r1",
          session_id: "s1",
          items: [
            { name: "Chicken Biryani", quantity: 1 },
            { name: "Garlic Naan", quantity: 1 },
          ],
        },
        {
          restaurant_id: "r1",
          session_id: "s2",
          items: [{ name: "Chicken Biryani", quantity: 1 }],
        },
        {
          restaurant_id: "r1",
          session_id: "s3",
          items: [{ name: "Mango Lassi", quantity: 1 }],
        },
      ],
      [
        {
          restaurant_id: "r1",
          trigger_text: "Chicken biryani",
          offer_text: "Garlic naan",
          is_active: true,
        },
      ]
    );

    expect(stats).toEqual({
      configuredRules: 1,
      eligibleOrders: 2,
      attachedOrders: 1,
      attachPercent: 50,
      attributedRevenueCents: null,
      revenueComplete: false,
      averageRevenuePerAttachedOrderCents: null,
      attachedAverageOrderCents: null,
      unattachedAverageOrderCents: null,
      observedTicketLiftCents: null,
      observedTicketLiftPercent: null,
      observedLiftComplete: false,
      attachedLiftSampleSize: 0,
      unattachedLiftSampleSize: 0,
      experimentTreatmentOrders: 0,
      experimentControlOrders: 0,
      experimentTreatmentAverageOrderCents: null,
      experimentControlAverageOrderCents: null,
      experimentTicketLiftCents: null,
      experimentTicketLiftPercent: null,
      experimentLiftComplete: false,
    });
  });

  it("attributes attached offer revenue and observed ticket lift from menu prices", () => {
    const menu = buildMenuPriceContext(
      [
        {
          id: "item-biryani",
          category_id: "cat-1",
          name: "Chicken Biryani",
          description: null,
          price: 14,
          is_available: true,
          sort_order: 1,
          raw_menu_data: null,
          updated_at: "",
        },
        {
          id: "item-naan",
          category_id: "cat-1",
          name: "Garlic Naan",
          description: null,
          price: 4,
          is_available: true,
          sort_order: 2,
          raw_menu_data: null,
          updated_at: "",
        },
      ],
      [
        {
          id: "mod-cheese",
          item_id: "item-naan",
          group_name: "Add-ons",
          modifier_name: "Cheese",
          extra_price: 1.5,
          min_selection: 0,
          max_selection: 2,
          sort_order: 1,
          group_sort_order: 1,
        },
      ]
    );

    const stats = aggregateUpsellAttachStats(
      [
        {
          restaurant_id: "r1",
          session_id: "s1",
          items: [
            { name: "Chicken Biryani", quantity: 1 },
            {
              name: "Garlic Naan",
              quantity: 2,
              customizations: ["Cheese"],
            },
          ],
        },
      ],
      [
        {
          restaurant_id: "r1",
          trigger_text: "Chicken biryani",
          offer_text: "Garlic naan",
          is_active: true,
        },
      ],
      new Map([["r1", menu]])
    );

    expect(stats).toMatchObject({
      eligibleOrders: 1,
      attachedOrders: 1,
      attachPercent: 100,
      attributedRevenueCents: 1100,
      revenueComplete: true,
      averageRevenuePerAttachedOrderCents: 1100,
      attachedAverageOrderCents: 2500,
      unattachedAverageOrderCents: null,
      observedTicketLiftCents: null,
      observedTicketLiftPercent: null,
      attachedLiftSampleSize: 1,
      unattachedLiftSampleSize: 0,
    });
  });

  it("compares eligible attached tickets to eligible unattached tickets", () => {
    const menu = buildMenuPriceContext(
      [
        {
          id: "item-biryani",
          category_id: "cat-1",
          name: "Chicken Biryani",
          description: null,
          price: 14,
          is_available: true,
          sort_order: 1,
          raw_menu_data: null,
          updated_at: "",
        },
        {
          id: "item-naan",
          category_id: "cat-1",
          name: "Garlic Naan",
          description: null,
          price: 4,
          is_available: true,
          sort_order: 2,
          raw_menu_data: null,
          updated_at: "",
        },
      ],
      []
    );

    const stats = aggregateUpsellAttachStats(
      [
        {
          restaurant_id: "r1",
          session_id: "s1",
          items: [
            { name: "Chicken Biryani", quantity: 1 },
            { name: "Garlic Naan", quantity: 1 },
          ],
        },
        {
          restaurant_id: "r1",
          session_id: "s2",
          items: [{ name: "Chicken Biryani", quantity: 1 }],
        },
      ],
      [
        {
          restaurant_id: "r1",
          trigger_text: "Chicken biryani",
          offer_text: "Garlic naan",
          is_active: true,
        },
      ],
      new Map([["r1", menu]])
    );

    expect(stats).toMatchObject({
      attachedAverageOrderCents: 1800,
      unattachedAverageOrderCents: 1400,
      observedTicketLiftCents: 400,
      observedTicketLiftPercent: 29,
      observedLiftComplete: true,
      attachedLiftSampleSize: 1,
      unattachedLiftSampleSize: 1,
    });
  });

  it("compares deterministic treatment and control eligible orders", () => {
    const treatmentSession =
      ["s1", "s2", "s3", "s4", "s5", "s6"].find(
        (sessionId) => getUpsellExperimentVariant("r1", sessionId) === "treatment"
      ) ?? "treatment";
    const controlSession =
      ["c1", "c2", "c3", "c4", "c5", "c6"].find(
        (sessionId) => getUpsellExperimentVariant("r1", sessionId) === "control"
      ) ?? "control";

    const menu = buildMenuPriceContext(
      [
        {
          id: "item-biryani",
          category_id: "cat-1",
          name: "Chicken Biryani",
          description: null,
          price: 14,
          is_available: true,
          sort_order: 1,
          raw_menu_data: null,
          updated_at: "",
        },
        {
          id: "item-naan",
          category_id: "cat-1",
          name: "Garlic Naan",
          description: null,
          price: 4,
          is_available: true,
          sort_order: 2,
          raw_menu_data: null,
          updated_at: "",
        },
      ],
      []
    );

    const stats = aggregateUpsellAttachStats(
      [
        {
          restaurant_id: "r1",
          session_id: treatmentSession,
          items: [
            { name: "Chicken Biryani", quantity: 1 },
            { name: "Garlic Naan", quantity: 1 },
          ],
        },
        {
          restaurant_id: "r1",
          session_id: controlSession,
          items: [{ name: "Chicken Biryani", quantity: 1 }],
        },
      ],
      [
        {
          restaurant_id: "r1",
          trigger_text: "Chicken biryani",
          offer_text: "Garlic naan",
          is_active: true,
        },
      ],
      new Map([["r1", menu]])
    );

    expect(stats).toMatchObject({
      experimentTreatmentOrders: 1,
      experimentControlOrders: 1,
      experimentTreatmentAverageOrderCents: 1800,
      experimentControlAverageOrderCents: 1400,
      experimentTicketLiftCents: 400,
      experimentTicketLiftPercent: 29,
      experimentLiftComplete: true,
    });
  });

  it("keeps restaurants scoped to their own upsell rules", () => {
    const stats = aggregateUpsellAttachStats(
      [
        {
          restaurant_id: "r2",
          session_id: "s1",
          items: [
            { name: "Chicken Biryani", quantity: 1 },
            { name: "Garlic Naan", quantity: 1 },
          ],
        },
      ],
      [
        {
          restaurant_id: "r1",
          trigger_text: "Chicken biryani",
          offer_text: "Garlic naan",
          is_active: true,
        },
      ]
    );

    expect(stats.eligibleOrders).toBe(0);
    expect(stats.attachedOrders).toBe(0);
    expect(stats.attachPercent).toBeNull();
    expect(stats.attributedRevenueCents).toBeNull();
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
        session_id: null,
        metadata: null,
      },
    ];
    const series = bucketUsageByDay(events, dayKeys);
    expect(series).toEqual([
      { date: "2026-05-17", orderSessions: 1, completed: 0, canceled: 0 },
      { date: "2026-05-18", orderSessions: 0, completed: 0, canceled: 0 },
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
          session_id: null,
          metadata: { import_id: "imp-1", outcome: "extracted" },
        },
        {
          event_type: "menu_scan",
          occurred_at: "2026-05-01",
          restaurant_id: null,
          session_id: null,
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
      updated_at: "",
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

describe("call event analytics", () => {
  it("counts post-call outcomes and peak call hours", () => {
    const events = [
      {
        restaurant_id: "r1",
        status: "ended",
        outcome: "order_completed",
        started_at: "2026-05-30T18:10:00.000Z",
        ended_at: "2026-05-30T18:12:00.000Z",
      },
      {
        restaurant_id: "r1",
        status: "ended",
        outcome: "no_order",
        started_at: "2026-05-30T18:30:00.000Z",
        ended_at: "2026-05-30T18:31:00.000Z",
      },
      {
        restaurant_id: "r1",
        status: "ended",
        outcome: "abandoned",
        started_at: "2026-05-30T19:30:00.000Z",
        ended_at: "2026-05-30T19:31:00.000Z",
      },
    ];

    expect(aggregateCallOutcomes(events)).toMatchObject({
      total: 3,
      completed: 1,
      noOrder: 1,
      abandoned: 1,
    });
    expect(peakCallHoursFromEvents(events)[0]).toMatchObject({
      hourUtc: 18,
      orderCount: 2,
    });
    expect(peakCallWindowsFromEvents(events)[0]).toMatchObject({
      dayLabel: "Sat",
      hourUtc: 18,
      callCount: 2,
      completedCount: 1,
      conversionPercent: 50,
    });
  });
});
