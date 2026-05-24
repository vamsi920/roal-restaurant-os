import type { DbItem, DbModifier } from "@/lib/types";

export const RESTAURANT_ID = "11111111-1111-4111-8111-111111111111";
export const ITEM_BURGER_ID = "22222222-2222-4222-8222-222222222222";
export const ITEM_SALAD_ID = "33333333-3333-4333-8333-333333333333";
export const ITEM_SOLD_OUT_ID = "44444444-4444-4444-8444-444444444444";
export const MOD_EXTRA_CHEESE_ID = "55555555-5555-4555-8555-555555555555";

export const menuItems: DbItem[] = [
  {
    id: ITEM_BURGER_ID,
    category_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    name: "Classic Burger",
    description: null,
    price: 12.5,
    is_available: true,
    sort_order: 0,
    raw_menu_data: null,
    updated_at: new Date().toISOString(),
  },
  {
    id: ITEM_SALAD_ID,
    category_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    name: "House Salad",
    description: null,
    price: 9,
    is_available: true,
    sort_order: 1,
    raw_menu_data: null,
    updated_at: new Date().toISOString(),
  },
  {
    id: ITEM_SOLD_OUT_ID,
    category_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    name: "Daily Special",
    description: null,
    price: 15,
    is_available: false,
    sort_order: 2,
    raw_menu_data: null,
    updated_at: new Date().toISOString(),
  },
];

export const menuModifiers: DbModifier[] = [
  {
    id: MOD_EXTRA_CHEESE_ID,
    item_id: ITEM_BURGER_ID,
    group_name: "Add-ons",
    modifier_name: "Extra cheese",
    extra_price: 1.5,
    min_selection: 0,
    max_selection: 2,
    sort_order: 0,
    group_sort_order: 0,
  },
];
