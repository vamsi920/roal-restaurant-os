import type { DbCategory, DbItem, DbModifier } from "@/lib/types";

export function filterItemsToCategories(
  items: DbItem[],
  categories: DbCategory[]
): DbItem[] {
  if (categories.length === 0) return [];
  const catIds = new Set(categories.map((c) => c.id));
  return items.filter((i) => catIds.has(i.category_id));
}

export function filterModifiersToItems(
  modifiers: DbModifier[],
  items: DbItem[]
): DbModifier[] {
  if (items.length === 0) return [];
  const itemIds = new Set(items.map((i) => i.id));
  return modifiers.filter((m) => itemIds.has(m.item_id));
}
