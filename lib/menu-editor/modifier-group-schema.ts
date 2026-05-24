import { z } from "zod";
import { normalizeMenuName, roundMenuPrice } from "@/lib/menu-editor/normalize";
import { resolveGroupSelectionBounds } from "@/lib/menu-editor/modifier-groups";

export const ModifierOptionInputSchema = z.object({
  id: z.string().uuid().optional(),
  modifier_name: z
    .string()
    .transform((v) => normalizeMenuName(v))
    .pipe(z.string().min(1, "Option name is required").max(120)),
  extra_price: z.preprocess(
    (v) => (typeof v === "number" && Number.isNaN(v) ? 0 : v),
    z.number().min(0).max(99999).transform(roundMenuPrice)
  ),
  sort_order: z.number().int().min(0).max(9999).optional(),
});

export const ModifierGroupInputSchema = z
  .object({
    item_id: z.string().uuid(),
    previous_group_name: z.string().max(80).optional(),
    group_name: z
      .string()
      .transform((v) => normalizeMenuName(v))
      .pipe(z.string().min(1, "Group name is required").max(80)),
    is_required: z.boolean(),
    min_selection: z.number().int().min(0).max(99).optional(),
    max_selection: z.preprocess(
      (v) => (typeof v === "number" && Number.isNaN(v) ? 0 : v),
      z.number().int().min(0).max(99)
    ),
    group_sort_order: z.number().int().min(0).max(9999).optional(),
    options: z
      .array(ModifierOptionInputSchema)
      .min(1, "Add at least one option"),
  })
  .superRefine((row, ctx) => {
    const names = new Set<string>();
    for (let i = 0; i < row.options.length; i++) {
      const key = row.options[i].modifier_name.toLowerCase();
      if (names.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Option names must be unique within the group",
          path: ["options", i, "modifier_name"],
        });
      }
      names.add(key);
    }

    const bounds = resolveGroupSelectionBounds({
      is_required: row.is_required,
      min_selection: row.min_selection,
      max_selection: row.max_selection,
      optionCount: row.options.length,
    });

    if (bounds.max_selection < bounds.min_selection) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Max selections must be greater than or equal to min",
        path: ["max_selection"],
      });
    }

    if (row.is_required && bounds.min_selection < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Required groups need min selections of at least 1",
        path: ["is_required"],
      });
    }
  });

export const ReorderModifierGroupsSchema = z.object({
  item_id: z.string().uuid(),
  order: z
    .array(
      z.object({
        group_name: z.string().min(1),
        group_sort_order: z.number().int().min(0).max(9999),
      })
    )
    .min(1),
});

export type ModifierGroupInput = z.infer<typeof ModifierGroupInputSchema>;
