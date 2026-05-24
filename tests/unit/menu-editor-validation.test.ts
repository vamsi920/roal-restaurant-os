import { describe, expect, it } from "vitest";
import {
  duplicateCategoryMessage,
  findDuplicateCategoryInList,
  findDuplicateItemInList,
} from "@/lib/menu-editor/errors";
import {
  CategoryInputSchema,
  ItemInputSchema,
} from "@/lib/menu-editor/validation";

describe("menu editor validation", () => {
  it("normalizes category names and rejects duplicates case-insensitively", () => {
    const list = [{ id: "a", name: "Pizza" }];
    const dup = findDuplicateCategoryInList(list, "  pizza ");
    expect(dup?.name).toBe("Pizza");
    expect(duplicateCategoryMessage("Pizza")).toContain("case-insensitive");
  });

  it("scopes item duplicate detection to category", () => {
    const items = [
      { id: "1", category_id: "cat-a", name: "Burger" },
      { id: "2", category_id: "cat-b", name: "Burger" },
    ];
    expect(findDuplicateItemInList(items, "cat-a", "burger")).toEqual(
      items[0]
    );
    expect(findDuplicateItemInList(items, "cat-b", "burger", "2")).toBeNull();
  });

  it("coerces NaN item price to null and rounds cents", () => {
    const parsed = ItemInputSchema.parse({
      category_id: "00000000-0000-4000-8000-000000000099",
      name: "Fries",
      price: Number.NaN,
      is_available: true,
    });
    expect(parsed.price).toBeNull();

    const priced = ItemInputSchema.parse({
      category_id: "00000000-0000-4000-8000-000000000099",
      name: "Fries",
      price: 4.999,
      is_available: true,
    });
    expect(priced.price).toBe(5);
  });

  it("rejects negative item price", () => {
    const result = ItemInputSchema.safeParse({
      category_id: "00000000-0000-4000-8000-000000000099",
      name: "Fries",
      price: -1,
      is_available: true,
    });
    expect(result.success).toBe(false);
  });

  it("parses category sort_order bounds", () => {
    const ok = CategoryInputSchema.parse({ name: "Sides", sort_order: 1 });
    expect(ok.name).toBe("Sides");

    const bad = CategoryInputSchema.safeParse({
      name: "Sides",
      sort_order: -1,
    });
    expect(bad.success).toBe(false);
  });
});
