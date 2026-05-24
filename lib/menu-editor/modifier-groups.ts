import type { ModifierGroupInput } from "@/lib/menu-editor/modifier-group-schema";
import { menuNamesEqual, normalizeMenuName, roundMenuPrice } from "@/lib/menu-editor/normalize";
import type { DbModifier } from "@/lib/types";

export type ModifierOptionView = {
  id: string;
  modifier_name: string;
  extra_price: number;
  sort_order: number;
};

export type ModifierGroupView = {
  item_id: string;
  group_name: string;
  is_required: boolean;
  min_selection: number;
  max_selection: number;
  group_sort_order: number;
  options: ModifierOptionView[];
};

export type ModifierOptionInput = {
  id?: string;
  modifier_name: string;
  extra_price: number;
  sort_order?: number;
};

export function groupKey(itemId: string, groupName: string): string {
  return `${itemId}::${normalizeMenuName(groupName).toLowerCase()}`;
}

/** Match modifier rows to a group label (case/whitespace insensitive). */
export function modifierBelongsToGroup(
  row: { item_id: string; group_name: string },
  itemId: string,
  groupName: string
): boolean {
  return row.item_id === itemId && menuNamesEqual(row.group_name, groupName);
}

export function aggregateModifierGroups(
  modifiers: DbModifier[],
  itemId?: string
): ModifierGroupView[] {
  const filtered = itemId
    ? modifiers.filter((m) => m.item_id === itemId)
    : modifiers;

  const map = new Map<string, DbModifier[]>();
  for (const row of filtered) {
    const k = groupKey(row.item_id, row.group_name);
    const arr = map.get(k) ?? [];
    arr.push(row);
    map.set(k, arr);
  }

  const groups: ModifierGroupView[] = [];
  for (const rows of map.values()) {
    const head = rows[0];
    const options = [...rows]
      .sort(
        (a, b) =>
          (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
          a.modifier_name.localeCompare(b.modifier_name)
      )
      .map((r) => ({
        id: r.id,
        modifier_name: r.modifier_name,
        extra_price: Number(r.extra_price),
        sort_order: r.sort_order ?? 0,
      }));

    const minSel = rows.reduce(
      (min, r) => Math.min(min, r.min_selection),
      rows[0].min_selection
    );
    const maxSel = rows.reduce(
      (max, r) => Math.max(max, r.max_selection),
      rows[0].max_selection
    );

    groups.push({
      item_id: head.item_id,
      group_name: head.group_name,
      is_required: minSel >= 1,
      min_selection: minSel,
      max_selection: maxSel,
      group_sort_order: head.group_sort_order ?? 0,
      options,
    });
  }

  return groups.sort(
    (a, b) =>
      a.group_sort_order - b.group_sort_order ||
      a.group_name.localeCompare(b.group_name)
  );
}

export function resolveGroupSelectionBounds(input: {
  is_required: boolean;
  min_selection?: number;
  max_selection: number;
  optionCount: number;
}): { min_selection: number; max_selection: number } {
  const optionCount = Math.max(0, input.optionCount);
  let min = input.is_required ? Math.max(1, input.min_selection ?? 1) : 0;
  let max = Math.max(min, input.max_selection);

  if (optionCount > 0 && max > optionCount) {
    max = optionCount;
  }
  if (optionCount > 0 && min > optionCount) {
    min = optionCount;
  }
  if (!input.is_required) {
    min = 0;
  }

  return { min_selection: min, max_selection: max };
}

export function findDuplicateOptionInGroup(
  options: ModifierOptionInput[],
  name: string,
  excludeId?: string
): ModifierOptionInput | null {
  for (const opt of options) {
    if (excludeId && opt.id === excludeId) continue;
    if (menuNamesEqual(opt.modifier_name, name)) return opt;
  }
  return null;
}

export function findDuplicateGroupInList(
  groups: ModifierGroupView[],
  itemId: string,
  groupName: string,
  previousGroupName?: string
): ModifierGroupView | null {
  const prevKey = previousGroupName
    ? groupKey(itemId, previousGroupName)
    : null;
  for (const g of groups) {
    if (g.item_id !== itemId) continue;
    const k = groupKey(g.item_id, g.group_name);
    if (prevKey && k === prevKey) continue;
    if (menuNamesEqual(g.group_name, groupName)) return g;
  }
  return null;
}

export function rowsFromGroupInput(
  input: ModifierGroupInput,
  bounds: { min_selection: number; max_selection: number }
): Omit<DbModifier, "id">[] {
  const groupName = normalizeMenuName(input.group_name);
  const groupSort = input.group_sort_order ?? 1;

  return input.options.map((opt, idx) => ({
    item_id: input.item_id,
    group_name: groupName,
    modifier_name: normalizeMenuName(opt.modifier_name),
    extra_price: roundMenuPrice(opt.extra_price),
    min_selection: bounds.min_selection,
    max_selection: bounds.max_selection,
    sort_order: opt.sort_order ?? idx + 1,
    group_sort_order: groupSort,
  }));
}
