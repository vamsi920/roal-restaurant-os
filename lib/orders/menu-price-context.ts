import type { DbItem, DbModifier } from "@/lib/types";

export type MenuPriceContext = {
  itemsByNormalizedName: Map<string, DbItem>;
  modifierPriceByName: Map<string, number>;
};

export function normalizeMenuName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function buildMenuPriceContext(
  items: DbItem[],
  modifiers: DbModifier[]
): MenuPriceContext {
  const itemsByNormalizedName = new Map<string, DbItem>();
  for (const item of items) {
    const key = normalizeMenuName(item.name);
    if (!itemsByNormalizedName.has(key)) {
      itemsByNormalizedName.set(key, item);
    }
  }

  const modifierPriceByName = new Map<string, number>();
  for (const mod of modifiers) {
    const key = normalizeMenuName(mod.modifier_name);
    const existing = modifierPriceByName.get(key);
    if (existing == null || mod.extra_price > existing) {
      modifierPriceByName.set(key, mod.extra_price);
    }
  }

  return { itemsByNormalizedName, modifierPriceByName };
}

export function findMenuItemByName(
  name: string,
  ctx: MenuPriceContext
): DbItem | null {
  const n = normalizeMenuName(name);
  const exact = ctx.itemsByNormalizedName.get(n);
  if (exact) return exact;

  for (const [key, item] of ctx.itemsByNormalizedName) {
    if (key === n || key.includes(n) || n.includes(key)) return item;
  }
  return null;
}

export function findModifierPrice(
  modifierName: string,
  ctx: MenuPriceContext
): number | null {
  const n = normalizeMenuName(modifierName);
  if (ctx.modifierPriceByName.has(n)) {
    return ctx.modifierPriceByName.get(n)!;
  }
  for (const [key, price] of ctx.modifierPriceByName) {
    if (key.includes(n) || n.includes(key)) return price;
  }
  return null;
}
