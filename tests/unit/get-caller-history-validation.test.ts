import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CallerHistorySummarySchema } from "@/lib/agent-tools/schemas";
import { simulateHarnessTool } from "@/lib/voice-agent/test-harness/simulate-tool";
import { RESTAURANT_ID } from "../fixtures/menu";

const REST_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

type StoredReceipt = Record<string, unknown>;

const SAFE_CALLER_KEYS = [
  "found",
  "customer_name",
  "customer_phone",
  "visit_count",
  "completed_order_count",
  "last_order_at",
  "last_order_items",
  "favorite_items",
  "message",
] as const;

function createReceiptStore(initial: Record<string, StoredReceipt[]>) {
  const receipts: Record<string, StoredReceipt[]> = { ...initial };

  const supabase = {
    from: vi.fn((table: string) => {
      if (table !== "phone_order_receipts") {
        throw new Error(`unexpected table ${table}`);
      }

      let restaurantId = "";
      let requirePhone = false;
      let nameMatch: string | undefined;
      let limit = 100;

      const builder = {
        select: vi.fn(() => builder),
        eq: vi.fn((column: string, value: unknown) => {
          if (column === "restaurant_id") restaurantId = String(value);
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
        then(
          onFulfilled?: (value: { data: StoredReceipt[]; error: null }) => unknown,
          onRejected?: (reason: unknown) => unknown
        ) {
          let rows = [...(receipts[restaurantId] ?? [])];
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
            String(b.created_at ?? "").localeCompare(String(a.created_at ?? ""))
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

  return { supabase, receipts };
}

const mariaReceiptRecent: StoredReceipt = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  restaurant_id: RESTAURANT_ID,
  session_id: "conv_caller_a_recent",
  customer_name: "Maria Lopez",
  customer_phone: "+1 (415) 555-1212",
  items: [{ name: "Margherita", quantity: 2 }],
  created_at: "2026-05-30T18:00:00.000Z",
};

const mariaReceiptOlder: StoredReceipt = {
  ...mariaReceiptRecent,
  id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  session_id: "conv_caller_a_older",
  items: [
    { name: "Margherita", quantity: 1 },
    { name: "Garlic Knots", quantity: 1 },
  ],
  created_at: "2026-05-29T12:00:00.000Z",
};

const foreignReceipt: StoredReceipt = {
  ...mariaReceiptRecent,
  id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  restaurant_id: REST_B,
  session_id: "conv_caller_foreign",
  customer_name: "Maria Lopez",
  customer_phone: "+1 (415) 555-1212",
  items: [{ name: "Secret Location Special", quantity: 1 }],
  created_at: "2026-05-30T19:00:00.000Z",
};

describe("get_caller_history harness", () => {
  let store: ReturnType<typeof createReceiptStore>;

  beforeEach(() => {
    store = createReceiptStore({
      [RESTAURANT_ID]: [mariaReceiptRecent, mariaReceiptOlder],
      [REST_B]: [foreignReceipt],
    });
  });

  it("matches local 10-digit phone against stored E.164", async () => {
    const result = await simulateHarnessTool({
      supabase: store.supabase as unknown as SupabaseClient,
      restaurantId: RESTAURANT_ID,
      tool: "get_caller_history",
      body: {
        restaurant_id: RESTAURANT_ID,
        customer_phone: "415-555-1212",
      },
      dryRun: false,
    });

    expect(result.ok).toBe(true);
    const caller = (result.response as { caller: { found: boolean; visit_count: number } })
      .caller;
    expect(caller.found).toBe(true);
    expect(caller.visit_count).toBe(2);
  });

  it("returns new-guest message when no history matches", async () => {
    const result = await simulateHarnessTool({
      supabase: store.supabase as unknown as SupabaseClient,
      restaurantId: RESTAURANT_ID,
      tool: "get_caller_history",
      body: {
        restaurant_id: RESTAURANT_ID,
        customer_phone: "0000000000",
      },
      dryRun: false,
    });

    expect(result.ok).toBe(true);
    const caller = (
      result.response as {
        caller: {
          found: boolean;
          visit_count: number;
          favorite_items: string[];
          last_order_items: string[];
          message: string;
        };
      }
    ).caller;
    expect(caller.found).toBe(false);
    expect(caller.visit_count).toBe(0);
    expect(caller.favorite_items).toEqual([]);
    expect(caller.last_order_items).toEqual([]);
    expect(caller.message).toMatch(/new guest/i);
  });

  it("does not leak receipts from another restaurant", async () => {
    const result = await simulateHarnessTool({
      supabase: store.supabase as unknown as SupabaseClient,
      restaurantId: RESTAURANT_ID,
      tool: "get_caller_history",
      body: {
        restaurant_id: RESTAURANT_ID,
        customer_name: "Maria Lopez",
      },
      dryRun: false,
    });

    expect(result.ok).toBe(true);
    const caller = (
      result.response as {
        caller: {
          found: boolean;
          visit_count: number;
          last_order_items: string[];
          favorite_items: string[];
        };
      }
    ).caller;
    expect(caller.found).toBe(true);
    expect(caller.visit_count).toBe(2);
    expect(caller.last_order_items).not.toContain("Secret Location Special");
    expect(caller.favorite_items).not.toContain("Secret Location Special");
    expect(JSON.stringify(result.response)).not.toContain(REST_B);
    expect(JSON.stringify(result.response)).not.toContain("conv_caller_foreign");
  });

  it("summarizes favorites from same-restaurant completed receipts only", async () => {
    const result = await simulateHarnessTool({
      supabase: store.supabase as unknown as SupabaseClient,
      restaurantId: RESTAURANT_ID,
      tool: "get_caller_history",
      body: {
        restaurant_id: RESTAURANT_ID,
        customer_phone: "+14155551212",
      },
      dryRun: false,
    });

    expect(result.ok).toBe(true);
    const caller = (
      result.response as {
        caller: {
          favorite_items: string[];
          last_order_items: string[];
          completed_order_count: number;
          last_order_at: string | null;
        };
      }
    ).caller;
    expect(caller.completed_order_count).toBe(2);
    expect(caller.last_order_at).toBe("2026-05-30T18:00:00.000Z");
    expect(caller.last_order_items).toEqual(["Margherita"]);
    expect(caller.favorite_items[0]).toBe("Margherita");
    expect(caller.favorite_items).toContain("Garlic Knots");
    expect(caller.favorite_items.length).toBeLessThanOrEqual(3);
  });

  it("returns a caller-safe response shape", async () => {
    const result = await simulateHarnessTool({
      supabase: store.supabase as unknown as SupabaseClient,
      restaurantId: RESTAURANT_ID,
      tool: "get_caller_history",
      body: {
        restaurant_id: RESTAURANT_ID,
        customer_phone: "4155551212",
      },
      dryRun: false,
    });

    expect(result.ok).toBe(true);
    const payload = result.response as { ok: true; caller: Record<string, unknown> };
    expect(Object.keys(payload).sort()).toEqual(["caller", "ok"]);
    expect(Object.keys(payload.caller).sort()).toEqual([...SAFE_CALLER_KEYS].sort());
    expect(CallerHistorySummarySchema.safeParse(payload.caller).success).toBe(true);
    expect(JSON.stringify(payload)).not.toMatch(
      /organization_id|restaurant_id|session_id|receipt_id|"id":/
    );
  });
});
