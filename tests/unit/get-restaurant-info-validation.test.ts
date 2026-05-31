import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { simulateHarnessTool } from "@/lib/voice-agent/test-harness/simulate-tool";
import { RESTAURANT_ID } from "../fixtures/menu";
import type { RestaurantHoursBundle } from "@/lib/restaurant-hours/types";
import type { RestaurantProfile } from "@/lib/restaurant-profile/schema";

const REST_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

vi.mock("@/lib/restaurant-profile/helpers", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/restaurant-profile/helpers")>();
  return {
    ...actual,
    getRestaurantProfile: vi.fn(),
  };
});

vi.mock("@/lib/restaurant-hours/helpers", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/restaurant-hours/helpers")>();
  return {
    ...actual,
    loadRestaurantHoursBundle: vi.fn(),
  };
});

vi.mock("@/lib/restaurant-knowledge/helpers", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/restaurant-knowledge/helpers")>();
  return {
    ...actual,
    loadRestaurantKnowledgeEntries: vi.fn(),
  };
});

import { getRestaurantProfile } from "@/lib/restaurant-profile/helpers";
import { loadRestaurantHoursBundle } from "@/lib/restaurant-hours/helpers";
import { loadRestaurantKnowledgeEntries } from "@/lib/restaurant-knowledge/helpers";

function restaurantSupabase(name: string) {
  return {
    from: vi.fn((table: string) => {
      if (table !== "restaurants") {
        throw new Error(`unexpected table ${table}`);
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({
              data: { id: RESTAURANT_ID, name },
              error: null,
            })),
          })),
        })),
      };
    }),
  };
}

const fullProfile: RestaurantProfile = {
  restaurant_id: RESTAURANT_ID,
  organization_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  phone: "+1 (415) 555-0100",
  website: "https://test-bistro.example",
  cuisine: "Neapolitan pizza",
  address_line1: "123 Main St",
  address_line2: null,
  city: "Austin",
  region: "TX",
  postal_code: "78701",
  country: "US",
  timezone: "America/Chicago",
  allows_pickup: true,
  allows_delivery: false,
  prep_time_minutes: 22,
  temporarily_closed: false,
  temporarily_closed_reason: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

function hoursBundle(
  evaluation: RestaurantHoursBundle["evaluation"]
): RestaurantHoursBundle {
  return {
    profile: {
      timezone: "America/Chicago",
      temporarily_closed: evaluation.status === "temporarily_closed",
      temporarily_closed_reason:
        evaluation.status === "temporarily_closed" ? "Renovation" : null,
    },
    weekly: [
      {
        id: "w1",
        restaurant_id: RESTAURANT_ID,
        day_of_week: 1,
        is_closed: false,
        open_time: "11:00",
        close_time: "21:00",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
    ],
    exceptions: [],
    evaluation,
  };
}

describe("get_restaurant_info harness", () => {
  beforeEach(() => {
    vi.mocked(getRestaurantProfile).mockReset();
    vi.mocked(loadRestaurantHoursBundle).mockReset();
    vi.mocked(loadRestaurantKnowledgeEntries).mockReset();
    vi.mocked(loadRestaurantKnowledgeEntries).mockResolvedValue([]);
  });

  it("returns open hours and profile facts from DB data", async () => {
    vi.mocked(getRestaurantProfile).mockResolvedValue(fullProfile);
    vi.mocked(loadRestaurantHoursBundle).mockResolvedValue(
      hoursBundle({
        ordering_allowed: true,
        is_open_now: true,
        status: "open",
        message: "Open now until 9:00 PM.",
        local_date: "2026-05-30",
        local_time: "18:00",
        local_day_of_week: 5,
        next_open_hint: null,
      })
    );

    const result = await simulateHarnessTool({
      supabase: restaurantSupabase("Test Bistro") as unknown as SupabaseClient,
      restaurantId: RESTAURANT_ID,
      tool: "get_restaurant_info",
      body: { restaurant_id: RESTAURANT_ID },
      dryRun: false,
    });

    expect(result.ok).toBe(true);
    const payload = result.response as {
      restaurant: {
        name: string;
        phone: string | null;
        website: string | null;
        address: { display: string | null };
        service_modes: { pickup: boolean; delivery: boolean };
        prep_time_message: string;
      };
      operations: {
        is_open_now: boolean;
        status: string;
        message: string;
        weekly_hours: unknown[];
      };
    };
    expect(payload.restaurant.name).toBe("Test Bistro");
    expect(payload.restaurant.phone).toBe(fullProfile.phone);
    expect(payload.restaurant.website).toBe(fullProfile.website);
    expect(payload.restaurant.address.display).toContain("123 Main St");
    expect(payload.restaurant.service_modes).toEqual({
      pickup: true,
      delivery: false,
    });
    expect(payload.operations.is_open_now).toBe(true);
    expect(payload.operations.status).toBe("open");
    expect(payload.operations.message).toContain("Open now");
    expect(payload.operations.weekly_hours.length).toBeGreaterThan(0);
    expect(payload.restaurant.prep_time_message).toMatch(/about 22 minutes/i);
    expect(payload.restaurant.prep_time_message).toMatch(/estimate/i);
  });

  it("reports temporarily closed without implying ordering is available", async () => {
    vi.mocked(getRestaurantProfile).mockResolvedValue({
      ...fullProfile,
      temporarily_closed: true,
      temporarily_closed_reason: "Renovation",
    });
    vi.mocked(loadRestaurantHoursBundle).mockResolvedValue(
      hoursBundle({
        ordering_allowed: false,
        is_open_now: false,
        status: "temporarily_closed",
        message: "We are temporarily closed: Renovation",
        local_date: "2026-05-30",
        local_time: "12:00",
        local_day_of_week: 5,
        next_open_hint: null,
      })
    );

    const result = await simulateHarnessTool({
      supabase: restaurantSupabase("Test Bistro") as unknown as SupabaseClient,
      restaurantId: RESTAURANT_ID,
      tool: "get_restaurant_info",
      body: {},
      dryRun: false,
    });

    expect(result.ok).toBe(true);
    const ops = (result.response as { operations: Record<string, unknown> }).operations;
    expect(ops.ordering_allowed).toBe(false);
    expect(ops.is_open_now).toBe(false);
    expect(ops.status).toBe("temporarily_closed");
    expect(String(ops.message)).toMatch(/temporarily closed/i);
  });

  it("does not invent open status when hours are unconfigured", async () => {
    vi.mocked(getRestaurantProfile).mockResolvedValue(null);
    vi.mocked(loadRestaurantHoursBundle).mockResolvedValue(null);

    const result = await simulateHarnessTool({
      supabase: restaurantSupabase("Test Bistro") as unknown as SupabaseClient,
      restaurantId: RESTAURANT_ID,
      tool: "get_restaurant_info",
      body: {},
      dryRun: false,
    });

    expect(result.ok).toBe(true);
    const payload = result.response as {
      restaurant: {
        phone: string | null;
        service_modes: { pickup: boolean; delivery: boolean };
        prep_time_message: string;
      };
      operations: {
        ordering_allowed: boolean;
        is_open_now: boolean;
        status: string;
        message: string;
      };
    };
    expect(payload.restaurant.phone).toBeNull();
    expect(payload.restaurant.service_modes).toEqual({
      pickup: false,
      delivery: false,
    });
    expect(payload.operations.ordering_allowed).toBe(false);
    expect(payload.operations.is_open_now).toBe(false);
    expect(payload.operations.status).toBe("closed");
    expect(payload.operations.message).toMatch(/not configured/i);
    expect(payload.operations.message).toMatch(/do not tell the caller/i);
    expect(payload.restaurant.prep_time_message).toMatch(/not configured/i);
    expect(payload.restaurant.prep_time_message).toMatch(/do not guess/i);
  });

  it("returns active knowledge entries only", async () => {
    vi.mocked(getRestaurantProfile).mockResolvedValue(fullProfile);
    vi.mocked(loadRestaurantHoursBundle).mockResolvedValue(
      hoursBundle({
        ordering_allowed: true,
        is_open_now: true,
        status: "open",
        message: "Open now.",
        local_date: "2026-05-30",
        local_time: "18:00",
        local_day_of_week: 5,
        next_open_hint: null,
      })
    );
    vi.mocked(loadRestaurantKnowledgeEntries).mockResolvedValue([
      {
        id: "k1",
        organization_id: fullProfile.organization_id,
        restaurant_id: RESTAURANT_ID,
        category: "directions",
        question: "Where do I park?",
        answer: "Use the lot behind the building.",
        is_active: true,
        sort_order: 0,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
    ]);

    const result = await simulateHarnessTool({
      supabase: restaurantSupabase("Test Bistro") as unknown as SupabaseClient,
      restaurantId: RESTAURANT_ID,
      tool: "get_restaurant_info",
      body: {},
      dryRun: false,
    });

    expect(result.ok).toBe(true);
    const entries = (
      result.response as {
        knowledge_entries: { category: string; question: string; answer: string }[];
      }
    ).knowledge_entries;
    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual({
      category: "directions",
      question: "Where do I park?",
      answer: "Use the lot behind the building.",
    });
    expect(JSON.stringify(result.response)).not.toContain("organization_id");
  });

  it("returns honest missing-knowledge guidance when no active entries exist", async () => {
    vi.mocked(getRestaurantProfile).mockResolvedValue(fullProfile);
    vi.mocked(loadRestaurantHoursBundle).mockResolvedValue(
      hoursBundle({
        ordering_allowed: true,
        is_open_now: true,
        status: "open",
        message: "Open now.",
        local_date: "2026-05-30",
        local_time: "18:00",
        local_day_of_week: 5,
        next_open_hint: null,
      })
    );
    vi.mocked(loadRestaurantKnowledgeEntries).mockResolvedValue([]);

    const result = await simulateHarnessTool({
      supabase: restaurantSupabase("Test Bistro") as unknown as SupabaseClient,
      restaurantId: RESTAURANT_ID,
      tool: "get_restaurant_info",
      body: {},
      dryRun: false,
    });

    expect(result.ok).toBe(true);
    const payload = result.response as {
      knowledge_entries: unknown[];
      knowledge_status_message: string;
    };
    expect(payload.knowledge_entries).toEqual([]);
    expect(payload.knowledge_status_message).toMatch(/do not invent/i);
  });

  it("loads only active knowledge entries for get_restaurant_info", async () => {
    vi.mocked(loadRestaurantKnowledgeEntries).mockResolvedValue([
      {
        id: "k1",
        organization_id: fullProfile.organization_id,
        restaurant_id: RESTAURANT_ID,
        category: "directions",
        question: "Where do I park?",
        answer: "Use the lot behind the building.",
        is_active: true,
        sort_order: 0,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      },
    ]);

    await simulateHarnessTool({
      supabase: restaurantSupabase("Test Bistro") as unknown as SupabaseClient,
      restaurantId: RESTAURANT_ID,
      tool: "get_restaurant_info",
      body: {},
      dryRun: false,
    });

    expect(loadRestaurantKnowledgeEntries).toHaveBeenCalledWith(
      expect.anything(),
      RESTAURANT_ID,
      expect.objectContaining({ activeOnly: true })
    );
  });

  it("blocks restaurant_id mismatch", async () => {
    const result = await simulateHarnessTool({
      supabase: restaurantSupabase("Test Bistro") as unknown as SupabaseClient,
      restaurantId: RESTAURANT_ID,
      tool: "get_restaurant_info",
      body: { restaurant_id: REST_B },
      dryRun: false,
    });

    expect(result.ok).toBe(false);
    expect(result.httpStatus).toBe(403);
    expect((result.response as { code: string }).code).toBe("restaurant_id_mismatch");
    expect(getRestaurantProfile).not.toHaveBeenCalled();
  });
});
