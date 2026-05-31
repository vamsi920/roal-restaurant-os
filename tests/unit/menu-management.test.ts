import { describe, expect, it, vi } from "vitest";
import { assertCategoryInRestaurant } from "@/lib/menu-editor/scope";
import { RESTAURANT_ID } from "../fixtures/menu";

const OTHER_RESTAURANT = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const CATEGORY_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("menu management scoping", () => {
  it("rejects category updates when category belongs to another restaurant", async () => {
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            })),
          })),
        })),
      })),
    };

    await expect(
      assertCategoryInRestaurant(supabase as never, OTHER_RESTAURANT, CATEGORY_ID)
    ).rejects.toThrow(/not found for this restaurant/i);
  });

  it("allows category when restaurant_id matches", async () => {
    const row = {
      id: CATEGORY_ID,
      restaurant_id: RESTAURANT_ID,
      name: "Mains",
      sort_order: 1,
      updated_at: "",
    };
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: row, error: null }),
            })),
          })),
        })),
      })),
    };

    const category = await assertCategoryInRestaurant(
      supabase as never,
      RESTAURANT_ID,
      CATEGORY_ID
    );
    expect(category.id).toBe(CATEGORY_ID);
  });
});
