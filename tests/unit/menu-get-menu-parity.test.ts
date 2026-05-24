import { describe, expect, it, vi } from "vitest";
import { buildGetMenuHarnessResponse } from "@/lib/voice-agent/test-harness/build-get-menu";
import {
  ITEM_BURGER_ID,
  ITEM_SALAD_ID,
  RESTAURANT_ID,
  menuItems,
  menuModifiers,
} from "../fixtures/menu";

const CAT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function mockSupabaseForMenu() {
  const restaurant = {
    id: RESTAURANT_ID,
    name: "Test Bistro",
    created_at: "2026-01-01T00:00:00Z",
  };
  const categories = [
    {
      id: CAT_ID,
      restaurant_id: RESTAURANT_ID,
      name: "Mains",
      sort_order: 1,
      updated_at: "",
    },
  ];

  return {
    from: vi.fn((table: string) => {
      if (table === "restaurants") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: restaurant, error: null }),
            })),
          })),
        };
      }
      if (table === "categories") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn().mockResolvedValue({ data: categories, error: null }),
            })),
          })),
        };
      }
      if (table === "items") {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => ({
              order: vi.fn(() => ({
                order: vi.fn().mockResolvedValue({
                  data: menuItems,
                  error: null,
                }),
              })),
            })),
          })),
        };
      }
      if (table === "modifiers") {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => ({
              order: vi.fn(() => ({
                order: vi.fn().mockResolvedValue({
                  data: menuModifiers,
                  error: null,
                }),
              })),
            })),
          })),
        };
      }
      throw new Error(`unexpected table ${table}`);
    }),
  };
}

vi.mock("@/lib/restaurant-hours/helpers", () => ({
  loadRestaurantHoursBundle: vi.fn().mockResolvedValue(null),
}));

describe("buildGetMenuHarnessResponse / Edge get-menu parity", () => {
  it("nests items under categories with price and availability", async () => {
    const supabase = mockSupabaseForMenu();
    const { httpStatus, body } = await buildGetMenuHarnessResponse(
      supabase as never,
      RESTAURANT_ID
    );

    expect(httpStatus).toBe(200);
    const categories = body.categories as {
      name: string;
      items: {
        id: string;
        name: string;
        price: number | null;
        is_available: boolean;
        modifiers: unknown[];
      }[];
    }[];

    expect(categories).toHaveLength(1);
    expect(categories[0].name).toBe("Mains");
    expect(categories[0].items.map((i) => i.id).sort()).toEqual(
      [ITEM_BURGER_ID, ITEM_SALAD_ID, menuItems[2].id].sort()
    );

    const burger = categories[0].items.find((i) => i.id === ITEM_BURGER_ID)!;
    expect(burger.price).toBe(12.5);
    expect(burger.is_available).toBe(true);
    expect(burger.modifiers.length).toBe(1);

    const soldOut = categories[0].items.find((i) => i.id === menuItems[2].id)!;
    expect(soldOut.is_available).toBe(false);
  });
});
