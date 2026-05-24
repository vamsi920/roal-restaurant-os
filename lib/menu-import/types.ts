import { z } from "zod";
import {
  MenuCategorySchema,
  MenuItemSchema,
  MenuSchema,
  ModifierSchema,
} from "@/lib/types";

export const ConfidenceLevelSchema = z.enum(["high", "medium", "low"]);

export type ConfidenceLevel = z.infer<typeof ConfidenceLevelSchema>;

export const ScannedModifierSchema = ModifierSchema.extend({
  confidence: ConfidenceLevelSchema.optional(),
});

export const ScannedItemSchema = MenuItemSchema.extend({
  confidence: ConfidenceLevelSchema.optional(),
  name_confidence: ConfidenceLevelSchema.optional(),
  price_confidence: ConfidenceLevelSchema.optional(),
  description_confidence: ConfidenceLevelSchema.optional(),
  modifiers: z.array(ScannedModifierSchema).optional().default([]),
});

export const ScannedCategorySchema = MenuCategorySchema.extend({
  confidence: ConfidenceLevelSchema.optional(),
  items: z.array(ScannedItemSchema).default([]),
});

export const ScannedMenuSchema = z.object({
  categories: z.array(ScannedCategorySchema).min(1),
});

export type ScannedMenu = z.infer<typeof ScannedMenuSchema>;
export type ScannedCategory = z.infer<typeof ScannedCategorySchema>;
export type ScannedItem = z.infer<typeof ScannedItemSchema>;
export type ScannedModifier = z.infer<typeof ScannedModifierSchema>;

export type ReviewHint = {
  path: string;
  severity: "warning" | "error";
  message: string;
  source: "model" | "heuristic";
};

export function toMergeMenu(menu: ScannedMenu): z.infer<typeof MenuSchema> {
  const parsed = MenuSchema.parse({
    categories: menu.categories.map((cat, idx) => ({
      name: cat.name,
      sort_order: cat.sort_order ?? idx + 1,
      items: cat.items.map((item) => ({
        name: item.name,
        description: item.description ?? null,
        price: item.price ?? null,
        base_availability: item.base_availability ?? true,
        modifiers: (item.modifiers ?? []).map((m) => ({
          group_name: m.group_name,
          modifier_name: m.modifier_name,
          extra_price: m.extra_price,
          min_selection: m.min_selection,
          max_selection: m.max_selection,
        })),
      })),
    })),
  });
  return parsed;
}
