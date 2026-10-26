import type { ScannedMenu } from "@/lib/menu-import/types";

export function scannedMenuHasPricedItems(menu: ScannedMenu | null | undefined): boolean {
  if (!menu) return false;
  return menu.categories.some((category) =>
    category.items.some((item) => typeof item.price === "number" && Number.isFinite(item.price))
  );
}
