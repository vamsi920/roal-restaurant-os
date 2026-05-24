import { menuNamesEqual } from "@/lib/menu-editor/normalize";

type PgErrorLike = {
  code?: string;
  message?: string;
  details?: string;
};

export function mapMenuDbError(
  error: PgErrorLike,
  entity: "category" | "item"
): string {
  if (error.code === "23505") {
    return entity === "category"
      ? "A category with this name already exists for this restaurant."
      : "An item with this name already exists in this category.";
  }
  if (error.code === "23503") {
    return "Related menu record was not found or is not in this restaurant.";
  }
  return error.message ?? "Database error";
}

export function duplicateCategoryMessage(existingName: string): string {
  return `A category named "${existingName}" already exists (names are case-insensitive).`;
}

export function duplicateItemMessage(existingName: string): string {
  return `An item named "${existingName}" already exists in this category (names are case-insensitive).`;
}

export function findDuplicateCategoryInList(
  categories: { id: string; name: string }[],
  name: string,
  excludeId?: string
): { id: string; name: string } | null {
  const normalized = name;
  for (const cat of categories) {
    if (excludeId && cat.id === excludeId) continue;
    if (menuNamesEqual(cat.name, normalized)) return cat;
  }
  return null;
}

export function findDuplicateItemInList(
  items: { id: string; category_id: string; name: string }[],
  categoryId: string,
  name: string,
  excludeId?: string
): { id: string; name: string } | null {
  for (const item of items) {
    if (item.category_id !== categoryId) continue;
    if (excludeId && item.id === excludeId) continue;
    if (menuNamesEqual(item.name, name)) return item;
  }
  return null;
}
