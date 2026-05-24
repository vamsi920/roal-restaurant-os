import type { ZodError } from "zod";
import { normalizeMenuName, roundMenuPrice } from "@/lib/menu-editor/normalize";
import { z } from "zod";

export const CategoryInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z
    .string()
    .transform((v) => normalizeMenuName(v))
    .pipe(z.string().min(1, "Name is required").max(120)),
  sort_order: z.number().int().min(0).max(9999),
});

export const ItemInputSchema = z
  .object({
    id: z.string().uuid().optional(),
    category_id: z.string().uuid(),
    name: z
      .string()
      .transform((v) => normalizeMenuName(v))
      .pipe(z.string().min(1, "Name is required").max(200)),
    description: z
      .string()
      .max(2000)
      .nullable()
      .optional()
      .transform((v) => (v == null || v.trim() === "" ? null : v.trim())),
    price: z.preprocess(
      (v) => (typeof v === "number" && Number.isNaN(v) ? null : v),
      z.number().min(0).max(99999).nullable().optional()
    ),
    is_available: z.boolean(),
    sort_order: z.number().int().min(0).max(9999).optional(),
  })
  .transform((row) => ({
    ...row,
    price: row.price != null ? roundMenuPrice(row.price) : null,
  }));

export const ReorderCategoriesSchema = z.object({
  order: z
    .array(
      z.object({
        id: z.string().uuid(),
        sort_order: z.number().int().min(0).max(9999),
      })
    )
    .min(1),
});

export const ReorderItemsSchema = z.object({
  category_id: z.string().uuid(),
  order: z
    .array(
      z.object({
        id: z.string().uuid(),
        sort_order: z.number().int().min(0).max(9999),
      })
    )
    .min(1),
});

export type CategoryInput = z.infer<typeof CategoryInputSchema>;
export type ItemInput = z.infer<typeof ItemInputSchema>;

export function formatZodFieldErrors(
  error: ZodError
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export function firstZodMessage(error: ZodError): string {
  return error.issues[0]?.message ?? "Invalid input";
}
