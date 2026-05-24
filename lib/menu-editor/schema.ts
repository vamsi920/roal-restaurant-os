/** @deprecated Import from @/lib/menu-editor/validation — kept for modifier schema. */
export {
  CategoryInputSchema,
  ItemInputSchema,
  type CategoryInput,
  type ItemInput,
} from "@/lib/menu-editor/validation";

import { z } from "zod";
import { normalizeMenuName } from "@/lib/menu-editor/normalize";

export const ModifierInputSchema = z.object({
  id: z.string().uuid().optional(),
  item_id: z.string().uuid(),
  group_name: z
    .string()
    .transform((v) => normalizeMenuName(v))
    .pipe(z.string().min(1, "Group is required").max(80)),
  modifier_name: z
    .string()
    .transform((v) => normalizeMenuName(v))
    .pipe(z.string().min(1, "Name is required").max(120)),
  extra_price: z.number().min(0).max(99999),
  min_selection: z.number().int().min(0).max(99),
  max_selection: z.number().int().min(0).max(99),
}).superRefine((row, ctx) => {
  if (row.max_selection < row.min_selection) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Max must be greater than or equal to min",
      path: ["max_selection"],
    });
  }
});

export type ModifierInput = z.infer<typeof ModifierInputSchema>;
