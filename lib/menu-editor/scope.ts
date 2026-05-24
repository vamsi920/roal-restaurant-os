import type { SupabaseClient } from "@supabase/supabase-js";
import type { DbCategory, DbItem } from "@/lib/types";

export async function assertCategoryInRestaurant(
  supabase: SupabaseClient,
  restaurantId: string,
  categoryId: string
): Promise<DbCategory> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("id", categoryId)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) {
    throw new Error("Category not found for this restaurant.");
  }
  return data as DbCategory;
}

export async function assertItemInRestaurant(
  supabase: SupabaseClient,
  restaurantId: string,
  itemId: string
): Promise<DbItem> {
  const { data: item, error } = await supabase
    .from("items")
    .select("*")
    .eq("id", itemId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!item) {
    throw new Error("Item not found for this restaurant.");
  }

  await assertCategoryInRestaurant(
    supabase,
    restaurantId,
    item.category_id as string
  );

  return item as DbItem;
}
