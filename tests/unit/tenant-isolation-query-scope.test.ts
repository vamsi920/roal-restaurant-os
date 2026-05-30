import { describe, expect, it, vi } from "vitest";
import { loadRestaurantAgentCallSessions } from "@/lib/agent-calls/load-call-sessions";
import { loadOrganizationAnalytics } from "@/lib/analytics/load-analytics";

const REST_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const REST_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const ORG_A = "11111111-1111-4111-8111-111111111111";

type Filter = { column: string; value: unknown };

function createThenableQuery(
  table: string,
  filters: Filter[],
  resolveValue: { data?: unknown[]; count?: number }
) {
  const builder = {
    select: vi.fn(function select() {
      return builder;
    }),
    eq: vi.fn((column: string, value: unknown) => {
      filters.push({ column, value });
      return builder;
    }),
    in: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    lte: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => ({
      data: resolveValue.data?.[0] ?? null,
      error: null,
    })),
    then(
      onFulfilled?: (value: unknown) => unknown,
      onRejected?: (reason: unknown) => unknown
    ) {
      const payload =
        resolveValue.count != null
          ? { data: resolveValue.data ?? [], error: null, count: resolveValue.count }
          : { data: resolveValue.data ?? [], error: null };
      return Promise.resolve(payload).then(onFulfilled, onRejected);
    },
  };
  return builder;
}

function createTrackingSupabase(options: {
  rows?: Record<string, unknown[]>;
}) {
  const filters: Filter[] = [];

  return {
    supabase: {
      from: vi.fn((table: string) =>
        createThenableQuery(table, filters, { data: options.rows?.[table] ?? [] })
      ),
    } as never,
    filters,
    getRestaurantFilters() {
      return filters.filter((f) => f.column === "restaurant_id");
    },
  };
}

describe("tenant isolation query scope (pass 30)", () => {
  it("loadRestaurantAgentCallSessions filters every surface by restaurant_id", async () => {
    const { supabase, getRestaurantFilters } = createTrackingSupabase({
      rows: {
        restaurant_profiles: [{ elevenlabs_agent_id: "agent-a" }],
        draft_orders: [],
        phone_order_receipts: [],
        usage_events: [],
        agent_call_events: [],
      },
    });

    await loadRestaurantAgentCallSessions(supabase, { restaurantId: REST_A });

    const scoped = getRestaurantFilters();
    expect(scoped.length).toBeGreaterThanOrEqual(5);
    expect(scoped.every((f) => f.value === REST_A)).toBe(true);
    expect(scoped.some((f) => f.value === REST_B)).toBe(false);
  });

  it("loadOrganizationAnalytics does not query foreign restaurant when id not in org", async () => {
    const orgFilters: Filter[] = [];
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "restaurants") {
          return createThenableQuery(table, orgFilters, {
            data: [{ id: REST_A, name: "Location A" }],
          });
        }
        return createThenableQuery(table, orgFilters, { data: [] });
      }),
    };

    const snapshot = await loadOrganizationAnalytics(supabase as never, {
      organizationId: ORG_A,
      organizationName: "Org A",
      restaurantId: REST_B,
      restaurantName: "Location B",
    });

    expect(snapshot.restaurantCount).toBe(0);
    expect(snapshot.summary.orderSessions).toBe(0);
    const restaurantScoped = orgFilters.filter((f) => f.column === "restaurant_id");
    expect(restaurantScoped.some((f) => f.value === REST_B)).toBe(false);
  });
});
