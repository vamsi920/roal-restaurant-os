import type { SupabaseClient } from "@supabase/supabase-js";
import {
  duplicateCategoryMessage,
  duplicateItemMessage,
  findDuplicateCategoryInList,
  findDuplicateItemInList,
} from "@/lib/menu-editor/errors";
import { normalizeMenuName } from "@/lib/menu-editor/normalize";

export async function assertCategoryNameAvailable(
  supabase: SupabaseClient,
  restaurantId: string,
  name: string,
  excludeId?: string
): Promise<void> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name")
    .eq("restaurant_id", restaurantId);

  if (error) throw new Error(error.message);

  const dup = findDuplicateCategoryInList(data ?? [], name, excludeId);
  if (dup) {
    throw new Error(duplicateCategoryMessage(dup.name));
  }
}

export async function assertItemNameAvailable(
  supabase: SupabaseClient,
  categoryId: string,
  name: string,
  excludeId?: string
): Promise<void> {
  const { data, error } = await supabase
    .from("items")
    .select("id, category_id, name")
    .eq("category_id", categoryId);

  if (error) throw new Error(error.message);

  const dup = findDuplicateItemInList(data ?? [], categoryId, name, excludeId);
  if (dup) {
    throw new Error(duplicateItemMessage(dup.name));
  }
}

/** Exact-name check against DB unique constraint (trimmed). */
export function canonicalMenuName(name: string): string {
  return normalizeMenuName(name);
}
