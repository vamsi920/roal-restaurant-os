import { describe, expect, it } from "vitest";
import {
  aggregateModifierGroups,
  modifierBelongsToGroup,
  resolveGroupSelectionBounds,
} from "@/lib/menu-editor/modifier-groups";
import { ModifierGroupInputSchema } from "@/lib/menu-editor/modifier-group-schema";
import type { DbModifier } from "@/lib/types";

const itemId = "00000000-0000-4000-8000-000000000010";

function mod(partial: Partial<DbModifier> & Pick<DbModifier, "group_name" | "modifier_name">): DbModifier {
  return {
    id: partial.id ?? "00000000-0000-4000-8000-000000000099",
    item_id: itemId,
    group_name: partial.group_name,
    modifier_name: partial.modifier_name,
    extra_price: partial.extra_price ?? 0,
    min_selection: partial.min_selection ?? 0,
    max_selection: partial.max_selection ?? 1,
    sort_order: partial.sort_order ?? 1,
    group_sort_order: partial.group_sort_order ?? 1,
  };
}

describe("modifier groups", () => {
  it("aggregates flat modifier rows into groups", () => {
    const rows = [
      mod({ group_name: "Size", modifier_name: "Small", min_selection: 1, max_selection: 1 }),
      mod({
        group_name: "Size",
        modifier_name: "Large",
        extra_price: 2,
        min_selection: 1,
        max_selection: 1,
      }),
    ];
    const groups = aggregateModifierGroups(rows, itemId);
    expect(groups).toHaveLength(1);
    expect(groups[0].options).toHaveLength(2);
    expect(groups[0].is_required).toBe(true);
    expect(groups[0].min_selection).toBe(1);
  });

  it("matches legacy group names case-insensitively", () => {
    const row = mod({ group_name: "  Add Ons ", modifier_name: "Cheese" });
    expect(modifierBelongsToGroup(row, itemId, "add ons")).toBe(true);
    expect(modifierBelongsToGroup(row, itemId, "Sides")).toBe(false);
  });

  it("clamps max selection to option count", () => {
    const bounds = resolveGroupSelectionBounds({
      is_required: true,
      max_selection: 5,
      optionCount: 2,
    });
    expect(bounds).toEqual({ min_selection: 1, max_selection: 2 });
  });

  it("optional groups allow zero min selections", () => {
    const bounds = resolveGroupSelectionBounds({
      is_required: false,
      max_selection: 2,
      optionCount: 3,
    });
    expect(bounds).toEqual({ min_selection: 0, max_selection: 2 });
  });

  it("rejects duplicate option names in a group", () => {
    const result = ModifierGroupInputSchema.safeParse({
      item_id: itemId,
      group_name: "Toppings",
      is_required: false,
      max_selection: 2,
      options: [
        { modifier_name: "Bacon", extra_price: 1 },
        { modifier_name: "bacon", extra_price: 2 },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("coerces invalid numeric fields before validation", () => {
    const parsed = ModifierGroupInputSchema.parse({
      item_id: itemId,
      group_name: "Extras",
      is_required: false,
      max_selection: Number.NaN,
      options: [{ modifier_name: "Sauce", extra_price: Number.NaN }],
    });
    expect(parsed.max_selection).toBe(0);
    expect(parsed.options[0].extra_price).toBe(0);
  });
});
