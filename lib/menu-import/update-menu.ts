import type { ScannedMenu } from "@/lib/menu-import/types";

export function cloneMenu(menu: ScannedMenu): ScannedMenu {
  return structuredClone(menu);
}

export function updateCategoryName(
  menu: ScannedMenu,
  categoryIndex: number,
  name: string
): ScannedMenu {
  const next = cloneMenu(menu);
  if (!next.categories[categoryIndex]) return next;
  next.categories[categoryIndex].name = name;
  return next;
}

export function updateItemField(
  menu: ScannedMenu,
  categoryIndex: number,
  itemIndex: number,
  field: "name" | "description" | "price" | "base_availability",
  value: string | number | boolean | null
): ScannedMenu {
  const next = cloneMenu(menu);
  const item = next.categories[categoryIndex]?.items[itemIndex];
  if (!item) return next;

  if (field === "name") item.name = String(value);
  else if (field === "description") {
    item.description =
      value == null || String(value).trim() === "" ? null : String(value);
  } else if (field === "price") {
    if (value === "" || value == null) {
      item.price = null;
    } else {
      const n = Number(value);
      item.price = Number.isFinite(n) ? n : null;
    }
  } else if (field === "base_availability") {
    item.base_availability = Boolean(value);
  }

  return next;
}

export function updateModifierField(
  menu: ScannedMenu,
  categoryIndex: number,
  itemIndex: number,
  modifierIndex: number,
  field: "group_name" | "modifier_name" | "extra_price" | "min_selection" | "max_selection",
  value: string | number
): ScannedMenu {
  const next = cloneMenu(menu);
  const mod =
    next.categories[categoryIndex]?.items[itemIndex]?.modifiers?.[modifierIndex];
  if (!mod) return next;

  if (field === "group_name") mod.group_name = String(value);
  else if (field === "modifier_name") mod.modifier_name = String(value);
  else if (field === "extra_price") mod.extra_price = Number(value);
  else if (field === "min_selection") mod.min_selection = Number(value);
  else if (field === "max_selection") mod.max_selection = Number(value);

  return next;
}

export function removeCategory(menu: ScannedMenu, categoryIndex: number): ScannedMenu {
  const next = cloneMenu(menu);
  next.categories.splice(categoryIndex, 1);
  return next;
}

export function removeItem(
  menu: ScannedMenu,
  categoryIndex: number,
  itemIndex: number
): ScannedMenu {
  const next = cloneMenu(menu);
  next.categories[categoryIndex]?.items.splice(itemIndex, 1);
  return next;
}
