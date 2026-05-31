import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { simulateHarnessTool } from "@/lib/voice-agent/test-harness/simulate-tool";
import { buildCallerOrderStatusTimeline } from "@/lib/orders/status-history";
import { RESTAURANT_ID } from "../fixtures/menu";
import type { DraftOrderRow } from "@/lib/types";

const REST_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const SESSION_A = "conv_order_status_a";
const SESSION_B = "conv_order_status_b";

type StoredOrder = Record<string, unknown>;

function createOrderStore(initial: Record<string, StoredOrder[]>) {
  const orders: Record<string, StoredOrder[]> = { ...initial };

  const supabase = {
    from: vi.fn((table: string) => {
      if (table !== "draft_orders") {
        throw new Error(`unexpected table ${table}`);
      }

      let restaurantId = "";
      let sessionId: string | undefined;
      let requirePhone = false;
      let nameMatch: string | undefined;
      let limit = 100;

      const builder = {
        select: vi.fn(() => builder),
        eq: vi.fn((column: string, value: unknown) => {
          if (column === "restaurant_id") restaurantId = String(value);
          if (column === "session_id") sessionId = String(value);
          return builder;
        }),
        not: vi.fn((column: string) => {
          if (column === "customer_phone") requirePhone = true;
          return builder;
        }),
        ilike: vi.fn((column: string, value: string) => {
          if (column === "customer_name") nameMatch = value;
          return builder;
        }),
        order: vi.fn(() => builder),
        limit: vi.fn((n: number) => {
          limit = n;
          return builder;
        }),
        maybeSingle: vi.fn(async () => {
          const rows = orders[restaurantId] ?? [];
          const row = sessionId
            ? rows.find((r) => r.session_id === sessionId) ?? null
            : null;
          return { data: row, error: null };
        }),
        then(
          onFulfilled?: (value: { data: StoredOrder[]; error: null }) => unknown,
          onRejected?: (reason: unknown) => unknown
        ) {
          let rows = [...(orders[restaurantId] ?? [])];
          if (requirePhone) {
            rows = rows.filter((r) => r.customer_phone);
          }
          if (nameMatch) {
            const target = nameMatch.toLowerCase();
            rows = rows.filter(
              (r) => String(r.customer_name ?? "").toLowerCase() === target
            );
          }
          rows.sort((a, b) =>
            String(b.updated_at ?? "").localeCompare(String(a.updated_at ?? ""))
          );
          return Promise.resolve({ data: rows.slice(0, limit), error: null }).then(
            onFulfilled,
            onRejected
          );
        },
      };

      return builder;
    }),
  };

  return { supabase, orders };
}

const readyOrder: StoredOrder = {
  id: "11111111-1111-4111-8111-111111111111",
  restaurant_id: RESTAURANT_ID,
  session_id: SESSION_A,
  status: "ready",
  items: [{ name: "Margherita", quantity: 2 }],
  customer_name: "Maria Lopez",
  customer_phone: "+1 (415) 555-1212",
  fulfillment_type: "pickup",
  created_at: "2026-05-30T17:00:00.000Z",
  updated_at: "2026-05-30T18:00:00.000Z",
  accepted_at: "2026-05-30T17:30:00.000Z",
  in_progress_at: "2026-05-30T17:45:00.000Z",
  ready_at: "2026-05-30T18:00:00.000Z",
  completed_at: null,
  canceled_at: null,
};

const canceledOrder: StoredOrder = {
  ...readyOrder,
  id: "22222222-2222-4222-8222-222222222222",
  session_id: "conv_canceled",
  status: "canceled",
  customer_name: "Alex Kim",
  customer_phone: "4155559999",
  ready_at: null,
  canceled_at: "2026-05-30T19:00:00.000Z",
};

const foreignOrder: StoredOrder = {
  ...readyOrder,
  id: "33333333-3333-4333-8333-333333333333",
  restaurant_id: REST_B,
  session_id: SESSION_B,
};

describe("get_order_status harness", () => {
  let store: ReturnType<typeof createOrderStore>;

  beforeEach(() => {
    store = createOrderStore({
      [RESTAURANT_ID]: [readyOrder, canceledOrder],
      [REST_B]: [foreignOrder],
    });
  });

  it("finds order by session_id with ready message and timeline", async () => {
    const result = await simulateHarnessTool({
      supabase: store.supabase as unknown as SupabaseClient,
      restaurantId: RESTAURANT_ID,
      tool: "get_order_status",
      body: {
        restaurant_id: RESTAURANT_ID,
        session_id: SESSION_A,
      },
      dryRun: false,
    });

    expect(result.ok).toBe(true);
    const order = result.response as {
      order: {
        found: boolean;
        status: string;
        message: string;
        status_timeline: { label: string }[];
      };
    };
    expect(order.order.found).toBe(true);
    expect(order.order.status).toBe("ready");
    expect(order.order.message).toContain("ready for pickup");
    expect(order.order.status_timeline.map((e) => e.label)).toContain(
      "Ready for pickup"
    );
  });

  it("falls back to phone digits when session is unknown", async () => {
    const result = await simulateHarnessTool({
      supabase: store.supabase as unknown as SupabaseClient,
      restaurantId: RESTAURANT_ID,
      tool: "get_order_status",
      body: {
        restaurant_id: RESTAURANT_ID,
        customer_phone: "415-555-1212",
      },
      dryRun: false,
    });

    expect(result.ok).toBe(true);
    const order = (result.response as { order: { found: boolean; session_id: string } })
      .order;
    expect(order.found).toBe(true);
    expect(order.session_id).toBe(SESSION_A);
  });

  it("falls back to guest name", async () => {
    const result = await simulateHarnessTool({
      supabase: store.supabase as unknown as SupabaseClient,
      restaurantId: RESTAURANT_ID,
      tool: "get_order_status",
      body: {
        restaurant_id: RESTAURANT_ID,
        customer_name: "Alex Kim",
      },
      dryRun: false,
    });

    expect(result.ok).toBe(true);
    const order = (result.response as { order: { found: boolean; status: string } })
      .order;
    expect(order.found).toBe(true);
    expect(order.status).toBe("canceled");
  });

  it("returns unknown order when nothing matches", async () => {
    const result = await simulateHarnessTool({
      supabase: store.supabase as unknown as SupabaseClient,
      restaurantId: RESTAURANT_ID,
      tool: "get_order_status",
      body: {
        restaurant_id: RESTAURANT_ID,
        customer_phone: "0000000000",
      },
      dryRun: false,
    });

    expect(result.ok).toBe(true);
    const order = (
      result.response as {
        order: { found: boolean; message: string; status_timeline: unknown[] };
      }
    ).order;
    expect(order.found).toBe(false);
    expect(order.message).toMatch(/could not find/i);
    expect(order.status_timeline).toEqual([]);
  });

  it("does not leak orders from another restaurant", async () => {
    const result = await simulateHarnessTool({
      supabase: store.supabase as unknown as SupabaseClient,
      restaurantId: RESTAURANT_ID,
      tool: "get_order_status",
      body: {
        restaurant_id: RESTAURANT_ID,
        session_id: SESSION_B,
      },
      dryRun: false,
    });

    expect(result.ok).toBe(true);
    expect((result.response as { order: { found: boolean } }).order.found).toBe(false);
  });
});

describe("buildCallerOrderStatusTimeline", () => {
  it("includes canceled milestone for canceled tickets", () => {
    const timeline = buildCallerOrderStatusTimeline(canceledOrder as DraftOrderRow);
    expect(timeline.map((e) => e.label)).toContain("Order canceled");
  });
});
