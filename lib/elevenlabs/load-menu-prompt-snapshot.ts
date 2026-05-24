import type { SupabaseClient } from "@supabase/supabase-js";
import type { MenuPromptSnapshot } from "@/lib/elevenlabs/agent-prompt";
import { loadRestaurantMenu } from "@/lib/menu-editor/load-menu";

export async function loadMenuPromptSnapshot(
  supabase: SupabaseClient,
  restaurantId: string
): Promise<MenuPromptSnapshot | null> {
  try {
    const menu = await loadRestaurantMenu(supabase, restaurantId);
    return {
      categoryCount: menu.categories.length,
      itemCount: menu.items.length,
      modifierCount: menu.modifiers.length,
    };
  } catch {
    return null;
  }
}
