import type { Db } from "@/lib/db";
import {
  serviceModesFromProfileFlags,
  type FulfillmentServiceModes,
} from "@/lib/agent-tools/server/order-validate";

export type MenuItemRow = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number | null;
  is_available: boolean;
};

export type MenuModifierRow = {
  id: string;
  item_id: string;
  group_name: string | null;
  modifier_name: string;
  extra_price: number | null;
  min_selection: number;
  max_selection: number;
};

export type RestaurantMenuSnapshot = {
  items: MenuItemRow[];
  modifiers: MenuModifierRow[];
};

export async function loadRestaurantMenuForValidation(
  db: Db,
  restaurantId: string
): Promise<RestaurantMenuSnapshot> {
  const { data: categories, error: cErr } = await db
    .from("categories")
    .select("id")
    .eq("restaurant_id", restaurantId);

  if (cErr) throw new Error(cErr.message);

  const categoryIds = (categories ?? []).map((c: { id: unknown }) => String(c.id));
  if (categoryIds.length === 0) {
    return { items: [], modifiers: [] };
  }

  const { data: items, error: iErr } = await db
    .from("items")
    .select("id, category_id, name, description, price, is_available")
    .in("category_id", categoryIds);

  if (iErr) throw new Error(iErr.message);

  const itemList = (items ?? []) as MenuItemRow[];
  const itemIds = itemList.map((i) => i.id);
  if (itemIds.length === 0) {
    return { items: itemList, modifiers: [] };
  }

  const { data: modifiers, error: mErr } = await db
    .from("modifiers")
    .select(
      "id, item_id, group_name, modifier_name, extra_price, min_selection, max_selection"
    )
    .in("item_id", itemIds);

  if (mErr) throw new Error(mErr.message);

  return {
    items: itemList,
    modifiers: (modifiers ?? []) as MenuModifierRow[],
  };
}

export async function loadFulfillmentServiceModes(
  db: Db,
  restaurantId: string
): Promise<FulfillmentServiceModes> {
  const { data, error } = await db
    .from("restaurant_profiles")
    .select("allows_pickup, allows_delivery")
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return serviceModesFromProfileFlags(data);
}
