import { describe, expect, it } from "vitest";
import {
  filterItemsToCategories,
  filterModifiersToItems,
} from "@/lib/menu-editor/live-menu-scope";
import type { DbCategory, DbItem, DbModifier } from "@/lib/types";

const catA = "00000000-0000-4000-8000-000000000001";
const catB = "00000000-0000-4000-8000-000000000002";
const itemA = "00000000-0000-4000-8000-000000000010";
const itemB = "00000000-0000-4000-8000-000000000011";

describe("live menu scope", () => {
  it("drops items outside loaded categories", () => {
    const categories = [{ id: catA }] as DbCategory[];
    const items = [
      { id: itemA, category_id: catA },
      { id: itemB, category_id: catB },
    ] as DbItem[];
    expect(filterItemsToCategories(items, categories)).toHaveLength(1);
    expect(filterItemsToCategories(items, categories)[0].id).toBe(itemA);
  });

  it("drops modifiers for items not in scope", () => {
    const items = [{ id: itemA, category_id: catA }] as DbItem[];
    const modifiers = [
      { id: "m1", item_id: itemA },
      { id: "m2", item_id: itemB },
    ] as DbModifier[];
    expect(filterModifiersToItems(modifiers, items)).toHaveLength(1);
  });
});
