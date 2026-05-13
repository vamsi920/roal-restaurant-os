import { z } from "zod";

export const ModifierSchema = z.object({
  group_name: z.string().min(1).default("Options"),
  modifier_name: z.string().min(1),
  extra_price: z.coerce.number().nonnegative().default(0),
  min_selection: z.coerce.number().int().nonnegative().default(0),
  max_selection: z.coerce.number().int().nonnegative().default(1),
});

export const MenuItemSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  price: z.coerce.number().nonnegative().optional().nullable(),
  base_availability: z.boolean().optional().default(true),
  modifiers: z.array(ModifierSchema).optional().default([]),
});

export const MenuCategorySchema = z.object({
  name: z.string().min(1),
  sort_order: z.coerce.number().int().optional(),
  items: z.array(MenuItemSchema).default([]),
});

export const MenuSchema = z.object({
  categories: z.array(MenuCategorySchema).min(1),
});

export type Menu = z.infer<typeof MenuSchema>;
export type MenuCategory = z.infer<typeof MenuCategorySchema>;
export type MenuItem = z.infer<typeof MenuItemSchema>;
export type Modifier = z.infer<typeof ModifierSchema>;

export type Restaurant = {
  id: string;
  name: string;
  created_at: string;
};

export type DbCategory = {
  id: string;
  restaurant_id: string;
  name: string;
  sort_order: number;
  updated_at: string;
};

export type DbItem = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number | null;
  is_available: boolean;
  raw_menu_data: unknown;
  updated_at: string;
};

export type DbModifier = {
  id: string;
  item_id: string;
  group_name: string;
  modifier_name: string;
  extra_price: number;
  min_selection: number;
  max_selection: number;
};

export type DraftOrderRow = {
  id: string;
  restaurant_id: string;
  session_id: string;
  status: "draft" | "confirmed";
  items: unknown;
  customer_name: string | null;
  customer_phone: string | null;
  created_at: string;
  updated_at: string;
};

/** Immutable receipt row (upsert on finalize per session). */
export type PhoneOrderReceiptRow = {
  id: string;
  restaurant_id: string;
  session_id: string;
  items: unknown;
  customer_name: string | null;
  customer_phone: string | null;
  created_at: string;
};
