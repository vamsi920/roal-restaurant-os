import { describe, expect, it, vi } from "vitest";
import { loadRestaurantMenu } from "@/lib/menu-editor/load-menu";
import { RESTAURANT_ID } from "../fixtures/menu";

function chain(res: { data: unknown; error: null }) {
  const terminal = {
    order: vi.fn().mockReturnValue(Promise.resolve(res)),
    maybeSingle: vi.fn().mockReturnValue(Promise.resolve(res)),
    limit: vi.fn().mockReturnValue({
      maybeSingle: vi.fn().mockReturnValue(Promise.resolve(res)),
    }),
    in: vi.fn().mockReturnValue({
      order: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue(Promise.resolve(res)),
      }),
    }),
    eq: vi.fn().mockReturnThis(),
  };
  terminal.eq.mockReturnValue(terminal);
  return terminal;
}

describe("loadRestaurantMenu", () => {
  it("returns empty snapshot when restaurant has no categories", async () => {
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => chain({ data: [], error: null })),
      })),
    };

    const snap = await loadRestaurantMenu(supabase as never, RESTAURANT_ID);
    expect(snap).toEqual({ categories: [], items: [], modifiers: [] });
    expect(supabase.from).toHaveBeenCalledWith("categories");
  });

  it("skips item and modifier queries when categories exist but have no items", async () => {
    const catId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const categories = [
      {
        id: catId,
        restaurant_id: RESTAURANT_ID,
        name: "Mains",
        sort_order: 1,
        updated_at: "",
      },
    ];
    let fromCalls = 0;
    const supabase = {
      from: vi.fn((table: string) => {
        fromCalls += 1;
        if (table === "categories") {
          return { select: vi.fn(() => chain({ data: categories, error: null })) };
        }
        if (table === "items") {
          return { select: vi.fn(() => chain({ data: [], error: null })) };
        }
        throw new Error(`unexpected table ${table}`);
      }),
    };

    const snap = await loadRestaurantMenu(supabase as never, RESTAURANT_ID);
    expect(snap.categories).toHaveLength(1);
    expect(snap.items).toEqual([]);
    expect(snap.modifiers).toEqual([]);
    expect(fromCalls).toBe(2);
  });
});
