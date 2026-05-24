import { beforeEach, describe, expect, it, vi } from "vitest";

const RESTAURANT_ID = "9d3263d1-4d9d-4f89-bfc5-160e2cca1855";
const ORG_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const memberships = [
  {
    id: "mem-1",
    organization_id: ORG_ID,
    user_id: USER_ID,
    role: "member" as const,
    created_at: "2026-01-01T00:00:00.000Z",
    organization: {
      id: ORG_ID,
      name: "Org",
      slug: "org",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    },
  },
];

const { getSessionUserMock } = vi.hoisted(() => ({
  getSessionUserMock: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  getSessionUser: getSessionUserMock,
}));

vi.mock("@/lib/auth/ensure-profile", () => ({
  ensureUserProfile: vi.fn(),
}));

vi.mock("@/lib/auth/claim-legacy-org", () => ({
  tryClaimLegacyPocMembership: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabase: vi.fn(),
}));

import { createServerSupabase } from "@/lib/supabase/server";
import { requireRestaurantAccess } from "@/lib/auth/context-server";

function restaurantRow(orgId = ORG_ID) {
  return {
    id: RESTAURANT_ID,
    organization_id: orgId,
    name: "Test",
    created_at: new Date().toISOString(),
  };
}

function supabaseForRestaurant(
  row: ReturnType<typeof restaurantRow> | null
) {
  return {
    from: (table: string) => {
      if (table === "memberships") {
        return {
          select: () => ({
            eq: () => ({
              order: async () => ({ data: memberships, error: null }),
            }),
          }),
        };
      }
      if (table === "restaurants") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: row, error: null }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    },
  };
}

describe("requireRestaurantAccess tenant scoping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionUserMock.mockResolvedValue({
      id: USER_ID,
      email: "op@example.invalid",
    } as never);
  });

  it("returns 401 when session user is missing", async () => {
    getSessionUserMock.mockResolvedValue(null);

    const result = await requireRestaurantAccess(RESTAURANT_ID);
    expect(result.errorResponse?.status).toBe(401);
    expect(result.access).toBeNull();
  });

  it("returns 404 when restaurant row is missing", async () => {
    vi.mocked(createServerSupabase).mockResolvedValue(
      supabaseForRestaurant(null) as never
    );

    const result = await requireRestaurantAccess(RESTAURANT_ID);
    expect(result.errorResponse?.status).toBe(404);
    const body = await result.errorResponse!.json();
    expect(body.error).toBe("Restaurant not found");
  });

  it("returns 403 when user has no membership for restaurant org", async () => {
    vi.mocked(createServerSupabase).mockResolvedValue(
      supabaseForRestaurant(
        restaurantRow("22222222-2222-4222-8222-222222222222")
      ) as never
    );

    const result = await requireRestaurantAccess(RESTAURANT_ID);
    expect(result.errorResponse?.status).toBe(403);
    const body = await result.errorResponse!.json();
    expect(body.error).toBe("Forbidden");
  });

  it("returns 403 when requireAdmin and user is member", async () => {
    vi.mocked(createServerSupabase).mockResolvedValue(
      supabaseForRestaurant(restaurantRow()) as never
    );

    const result = await requireRestaurantAccess(RESTAURANT_ID, {
      requireAdmin: true,
    });
    expect(result.errorResponse?.status).toBe(403);
    const body = await result.errorResponse!.json();
    expect(body.error).toMatch(/Admin or owner/);
  });

  it("grants access for member in matching org", async () => {
    vi.mocked(createServerSupabase).mockResolvedValue(
      supabaseForRestaurant(restaurantRow()) as never
    );

    const result = await requireRestaurantAccess(RESTAURANT_ID);
    expect(result.errorResponse).toBeNull();
    expect(result.access?.restaurant.id).toBe(RESTAURANT_ID);
    expect(result.access?.role).toBe("member");
  });
});
