import { QueryBuilder, deleteCascade, type DbResult } from "@/lib/db/query";
import type { Row } from "@/lib/db/schema";
import type { DocStore } from "@/lib/db/store";

/** Ports of the old Postgres functions `merge_menu` and `clear_restaurant_menu`. */

type MenuPayload = {
  categories?: Array<{
    name?: string;
    sort_order?: number;
    items?: Array<{
      name?: string;
      description?: string | null;
      price?: number | string | null;
      base_availability?: boolean;
      sort_order?: number;
      modifiers?: Array<{
        group_name?: string | null;
        modifier_name?: string;
        extra_price?: number | string | null;
        min_selection?: number;
        max_selection?: number;
      }>;
    }>;
  }>;
};

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

async function mergeMenu(store: DocStore, restaurantId: string, menu: MenuPayload): Promise<Row> {
  if (!menu || !Array.isArray(menu.categories)) throw new Error("invalid menu payload: missing categories array");
  const restaurant = await store.get("restaurants", restaurantId);
  if (!restaurant) throw new Error(`restaurant ${restaurantId} not found`);
  const ts = new Date().toISOString();
  let categories = 0;
  let items = 0;
  let modifiers = 0;

  for (const cat of menu.categories) {
    categories += 1;
    const name = String(cat.name ?? "").trim();
    const sort = num(cat.sort_order) ?? categories;
    const existing = (await new QueryBuilder(store, "categories").select("*").eq("restaurant_id", restaurantId).eq("name", name)).data as unknown as Row[];
    let categoryId: string;
    if (existing[0]) {
      categoryId = String(existing[0].id);
      await new QueryBuilder(store, "categories").update({ sort_order: sort, updated_at: ts }).eq("id", categoryId);
    } else {
      const ins = (await new QueryBuilder(store, "categories")
        .insert({ restaurant_id: restaurantId, name, sort_order: sort, updated_at: ts })
        .select("id")
        .single()) as DbResult<Row>;
      if (ins.error) throw new Error(ins.error.message);
      categoryId = String(ins.data.id);
    }

    let itemSort = 0;
    for (const item of cat.items ?? []) {
      items += 1;
      itemSort += 1;
      const itemName = String(item.name ?? "").trim();
      const fields: Row = {
        description: item.description ? String(item.description) : null,
        price: num(item.price),
        is_available: item.base_availability ?? true,
        sort_order: num(item.sort_order) ?? itemSort,
        raw_menu_data: item,
        updated_at: ts,
      };
      const found = (await new QueryBuilder(store, "items").select("*").eq("category_id", categoryId).eq("name", itemName)).data as unknown as Row[];
      let itemId: string;
      if (found[0]) {
        itemId = String(found[0].id);
        await new QueryBuilder(store, "items").update(fields).eq("id", itemId);
      } else {
        const ins = (await new QueryBuilder(store, "items")
          .insert({ category_id: categoryId, name: itemName, ...fields })
          .select("id")
          .single()) as DbResult<Row>;
        if (ins.error) throw new Error(ins.error.message);
        itemId = String(ins.data.id);
      }

      await new QueryBuilder(store, "modifiers").delete().eq("item_id", itemId);
      for (const m of item.modifiers ?? []) {
        modifiers += 1;
        await new QueryBuilder(store, "modifiers").insert({
          item_id: itemId,
          group_name: m.group_name?.trim() || "Options",
          modifier_name: String(m.modifier_name ?? "").trim(),
          extra_price: num(m.extra_price) ?? 0,
          min_selection: num(m.min_selection) ?? 0,
          max_selection: num(m.max_selection) ?? 1,
        });
      }
    }
  }
  return { ok: true, categories, items, modifiers };
}

async function clearRestaurantMenu(store: DocStore, restaurantId: string): Promise<number> {
  if (!(await store.get("restaurants", restaurantId))) throw new Error("restaurant not found");
  const cats = await store.list("categories", [{ column: "restaurant_id", op: "==", value: restaurantId }]);
  for (const c of cats) await deleteCascade(store, "categories", c);
  return cats.length;
}

export async function runRpc(
  store: DocStore,
  name: string,
  args: Record<string, unknown>
): Promise<DbResult<unknown>> {
  try {
    if (name === "merge_menu") {
      const data = await mergeMenu(store, String(args.p_restaurant_id), args.p_menu as MenuPayload);
      return { data, error: null, count: null, status: 200 };
    }
    if (name === "clear_restaurant_menu") {
      const data = await clearRestaurantMenu(store, String(args.p_restaurant_id));
      return { data, error: null, count: null, status: 200 };
    }
    return { data: null, error: { message: `Unknown function ${name}` }, count: null, status: 404 };
  } catch (e) {
    return { data: null, error: { message: e instanceof Error ? e.message : String(e) }, count: null, status: 400 };
  }
}
