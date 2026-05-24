import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/restaurants/[id]/orders/compute-totals/route";
import {
  ITEM_BURGER_ID,
  ITEM_SOLD_OUT_ID,
  RESTAURANT_ID,
  menuItems,
  menuModifiers,
} from "../fixtures/menu";
import type { DbItem, DbModifier } from "@/lib/types";

const USER_ID = "77777777-7777-4777-8777-777777777777";

vi.mock("@/lib/auth/context-server", () => ({
  requireRestaurantAccess: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabase: vi.fn(),
}));

import { requireRestaurantAccess } from "@/lib/auth/context-server";
import { createServerSupabase } from "@/lib/supabase/server";

function accessOk() {
  return {
    access: {
      restaurant: {
        id: RESTAURANT_ID,
        organization_id: "11111111-1111-4111-8111-111111111111",
        name: "Test",
        created_at: new Date().toISOString(),
      },
      membership: {} as never,
      role: "owner" as const,
    },
    context: { user: { id: USER_ID } } as never,
    errorResponse: null,
  };
}

function mockMenuSupabase(options?: {
  profile?: { tax_rate_percent: number; service_fee_percent: number } | null;
  items?: DbItem[];
  modifiers?: DbModifier[];
}) {
  const categoryId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  vi.mocked(createServerSupabase).mockResolvedValue({
    from: vi.fn((table: string) => {
      if (table === "restaurant_profiles") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: options?.profile ?? {
                  tax_rate_percent: 8.875,
                  service_fee_percent: 10,
                },
                error: null,
              }),
            })),
          })),
        };
      }
      if (table === "categories") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({
              data: [{ id: categoryId }],
              error: null,
            }),
          })),
        };
      }
      if (table === "items") {
        return {
          select: vi.fn(() => ({
            in: vi.fn().mockResolvedValue({
              data: options?.items ?? menuItems,
              error: null,
            }),
          })),
        };
      }
      if (table === "modifiers") {
        return {
          select: vi.fn(() => ({
            in: vi.fn().mockResolvedValue({
              data: options?.modifiers ?? menuModifiers,
              error: null,
            }),
          })),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    }),
  } as never);
}

function postComputeTotals(body: Record<string, unknown>) {
  return POST(
    new Request("http://localhost/api/compute-totals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: { id: RESTAURANT_ID } }
  );
}

describe("POST /api/restaurants/[id]/orders/compute-totals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(requireRestaurantAccess).mockResolvedValue({
      access: null,
      context: null,
      errorResponse: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const res = await postComputeTotals({
      items: [{ name: "Classic Burger", quantity: 1 }],
    });
    expect(res.status).toBe(401);
  });

  it("returns 400 when items is not an array", async () => {
    vi.mocked(requireRestaurantAccess).mockResolvedValue(accessOk());
    mockMenuSupabase();

    const res = await postComputeTotals({ items: "nope" });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("items must be an array");
  });

  it("returns 400 for unknown items with structured issues", async () => {
    vi.mocked(requireRestaurantAccess).mockResolvedValue(accessOk());
    mockMenuSupabase();

    const res = await postComputeTotals({
      items: [{ name: "Mystery Taco", quantity: 1 }],
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("order_validation_failed");
    expect(body.issues.some((i: { code: string }) => i.code === "unknown_item_name")).toBe(
      true
    );
  });

  it("returns 400 for unavailable items", async () => {
    vi.mocked(requireRestaurantAccess).mockResolvedValue(accessOk());
    mockMenuSupabase();

    const res = await postComputeTotals({
      items: [{ item_id: ITEM_SOLD_OUT_ID, quantity: 1 }],
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.issues.some((i: { code: string }) => i.code === "item_unavailable")).toBe(
      true
    );
  });

  it("returns 400 for empty cart", async () => {
    vi.mocked(requireRestaurantAccess).mockResolvedValue(accessOk());
    mockMenuSupabase();

    const res = await postComputeTotals({ items: [] });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.issues.some((i: { code: string }) => i.code === "empty_cart")).toBe(true);
  });

  it("returns totals for valid items, modifiers, and profile pricing", async () => {
    vi.mocked(requireRestaurantAccess).mockResolvedValue(accessOk());
    mockMenuSupabase();

    const res = await postComputeTotals({
      items: [
        {
          item_id: ITEM_BURGER_ID,
          quantity: 2,
          customizations: ["Extra cheese"],
        },
      ],
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.totals.complete).toBe(true);
    expect(body.totals.subtotal).toBe(28);
    expect(body.pricing.taxRatePercent).toBe(8.875);
    expect(body.pricing.serviceFeePercent).toBe(10);
    expect(body.totals.total).toBeGreaterThan(28);
  });
});
