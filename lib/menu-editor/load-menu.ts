import type { SupabaseClient } from "@supabase/supabase-js";
import type { DbCategory, DbItem, DbModifier } from "@/lib/types";

export type RestaurantMenuSnapshot = {
  categories: DbCategory[];
  items: DbItem[];
  modifiers: DbModifier[];
};

export async function loadRestaurantMenu(
  supabase: SupabaseClient,
  restaurantId: string
): Promise<RestaurantMenuSnapshot> {
  const { data: categories, error: cErr } = await supabase
    .from("categories")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("sort_order", { ascending: true });

  if (cErr) throw new Error(cErr.message);

  const cats = (categories ?? []) as DbCategory[];
  const categoryIds = cats.map((c) => c.id);

  if (categoryIds.length === 0) {
    return { categories: [], items: [], modifiers: [] };
  }

  const { data: items, error: iErr } = await supabase
    .from("items")
    .select("*")
    .in("category_id", categoryIds)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (iErr) throw new Error(iErr.message);

  const itemList = (items ?? []) as DbItem[];
  const itemIds = itemList.map((i) => i.id);

  if (itemIds.length === 0) {
    return { categories: cats, items: itemList, modifiers: [] };
  }

  const { data: modifiers, error: mErr } = await supabase
    .from("modifiers")
    .select("*")
    .in("item_id", itemIds)
    .order("group_sort_order", { ascending: true })
    .order("sort_order", { ascending: true });

  if (mErr) throw new Error(mErr.message);

  return {
    categories: cats,
    items: itemList,
    modifiers: (modifiers ?? []) as DbModifier[],
  };
}
