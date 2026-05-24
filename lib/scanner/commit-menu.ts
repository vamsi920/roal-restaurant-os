import { toMergeMenu } from "@/lib/menu-import/types";
import type { ScannedMenu } from "@/lib/menu-import/types";
import { createServerSupabase } from "@/lib/supabase/server";

export async function commitMenuToRestaurant(
  restaurantId: string,
  menu: ScannedMenu
) {
  const mergePayload = toMergeMenu(menu);
  const supabase = await createServerSupabase();

  const { data, error } = await supabase.rpc("merge_menu", {
    p_restaurant_id: restaurantId,
    p_menu: mergePayload,
  });

  if (error) {
    throw new Error(`Merge failed: ${error.message}`);
  }

  const stats = (data as {
    categories: number;
    items: number;
    modifiers: number;
  }) ?? {
    categories: 0,
    items: 0,
    modifiers: 0,
  };

  return { stats, menu: mergePayload };
}
