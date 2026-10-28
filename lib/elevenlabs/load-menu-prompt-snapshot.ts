import type { Db } from "@/lib/db";
import type { MenuPromptSnapshot } from "@/lib/elevenlabs/agent-prompt";
import { loadRestaurantMenu } from "@/lib/menu-editor/load-menu";

export async function loadMenuPromptSnapshot(
  supabase: Db,
  restaurantId: string
): Promise<MenuPromptSnapshot | null> {
  try {
    const menu = await loadRestaurantMenu(supabase, restaurantId);
    return {
      categoryCount: menu.categories.length,
      itemCount: menu.items.length,
      modifierCount: menu.modifiers.length,
      lines: menuPromptLines(menu),
    };
  } catch {
    return null;
  }
}

/** Most menus fit easily; a giant one is clipped and the host falls back to get_menu_items for the rest. */
const MAX_MENU_PROMPT_CHARS = 12_000;

function money(n: number): string {
  return `$${n.toFixed(2)}`;
}

/**
 * The menu as short spoken-friendly lines ("Rolls: Chicken Tikka Roll $11.99 (Spice: mild, hot)")
 * so the host can answer and take orders without stopping to look it up.
 */
export function menuPromptLines(menu: {
  categories: { id: string; name: string; sort_order: number }[];
  items: { id: string; category_id: string; name: string; price: number | null; is_available: boolean; sort_order: number; description: string | null }[];
  modifiers: { item_id: string; group_name: string; modifier_name: string; extra_price: number }[];
}): string {
  const mods = new Map<string, Map<string, string[]>>();
  for (const m of menu.modifiers) {
    const groups = mods.get(m.item_id) ?? new Map<string, string[]>();
    const opts = groups.get(m.group_name) ?? [];
    opts.push(m.extra_price > 0 ? `${m.modifier_name} +${money(m.extra_price)}` : m.modifier_name);
    groups.set(m.group_name, opts);
    mods.set(m.item_id, groups);
  }
  const out: string[] = [];
  const cats = [...menu.categories].sort((a, b) => a.sort_order - b.sort_order);
  for (const cat of cats) {
    const items = menu.items
      .filter((i) => i.category_id === cat.id && i.is_available)
      .sort((a, b) => a.sort_order - b.sort_order);
    if (!items.length) continue;
    out.push(`${cat.name}:`);
    for (const item of items) {
      const price = item.price != null ? ` ${money(item.price)}` : "";
      const desc = item.description?.trim() ? ` — ${item.description.trim().slice(0, 80)}` : "";
      const groups = mods.get(item.id);
      const opts = groups
        ? ` (${[...groups].map(([g, o]) => `${g}: ${o.join(", ")}`).join("; ")})`
        : "";
      out.push(`- ${item.name}${price}${opts}${desc}`);
    }
  }
  const text = out.join("\n");
  return text.length > MAX_MENU_PROMPT_CHARS ? `${text.slice(0, MAX_MENU_PROMPT_CHARS)}\n(more items: use get_menu_items)` : text;
}
