import type {
  HarnessMenuContext,
  HarnessRequiredModifierHint,
} from "@/lib/voice-agent/test-harness/types";

function modifierGroupsFromItem(
  modifiers: unknown[]
): Map<string, { min: number; names: string[] }> {
  const groupMin = new Map<string, { min: number; names: string[] }>();
  for (const rawMod of modifiers) {
    if (!rawMod || typeof rawMod !== "object") continue;
    const m = rawMod as Record<string, unknown>;
    const group =
      typeof m.group_name === "string" && m.group_name.trim()
        ? m.group_name.trim()
        : "Options";
    const modName =
      typeof m.modifier_name === "string" ? m.modifier_name.trim() : "";
    const minSel =
      typeof m.min_selection === "number" && Number.isFinite(m.min_selection)
        ? Math.max(0, m.min_selection)
        : 0;
    const entry = groupMin.get(group) ?? { min: 0, names: [] };
    entry.min = Math.max(entry.min, minSel);
    if (modName) entry.names.push(modName);
    groupMin.set(group, entry);
  }
  return groupMin;
}

function requiredModifierHint(
  itemName: string,
  groupMin: Map<string, { min: number; names: string[] }>
): HarnessRequiredModifierHint | null {
  for (const [groupName, entry] of groupMin) {
    if (entry.min > 0 && entry.names[0]) {
      return {
        itemName,
        groupName,
        exampleModifierName: entry.names[0],
      };
    }
  }
  return null;
}

function hasRequiredModifierGroups(
  groupMin: Map<string, { min: number; names: string[] }>
): boolean {
  for (const entry of groupMin.values()) {
    if (entry.min > 0) return true;
  }
  return false;
}

export function menuContextFromGetMenuResponse(
  response: unknown
): HarnessMenuContext | null {
  if (!response || typeof response !== "object") return null;
  const r = response as Record<string, unknown>;

  const operations =
    r.operations && typeof r.operations === "object"
      ? (r.operations as Record<string, unknown>)
      : {};

  const orderingAllowed = operations.ordering_allowed !== false;
  const operationsMessage =
    typeof operations.message === "string"
      ? operations.message
      : "Hours not configured.";

  const categories = Array.isArray(r.categories) ? r.categories : [];
  let simpleFirstName: string | null = null;
  let simpleFirstId: string | null = null;
  let simpleSecondName: string | null = null;
  let anyFirstName: string | null = null;
  let anyFirstId: string | null = null;
  let anySecondName: string | null = null;
  let firstUnavailableName: string | null = null;
  let requiredModifier: HarnessRequiredModifierHint | null = null;
  let itemCount = 0;

  for (const cat of categories) {
    if (!cat || typeof cat !== "object") continue;
    const items = Array.isArray((cat as Record<string, unknown>).items)
      ? ((cat as Record<string, unknown>).items as unknown[])
      : [];
    for (const raw of items) {
      if (!raw || typeof raw !== "object") continue;
      const it = raw as Record<string, unknown>;
      const name = typeof it.name === "string" ? it.name : null;
      const id = typeof it.id === "string" ? it.id : null;

      if (it.is_available === false) {
        if (!firstUnavailableName && name) firstUnavailableName = name;
        continue;
      }

      itemCount += 1;
      const mods = Array.isArray(it.modifiers) ? it.modifiers : [];
      const groupMin = modifierGroupsFromItem(mods);

      if (!requiredModifier && name) {
        requiredModifier = requiredModifierHint(name, groupMin);
      }

      const needsRequired = hasRequiredModifierGroups(groupMin);

      if (!needsRequired && name) {
        if (!simpleFirstName) {
          simpleFirstName = name;
          simpleFirstId = id;
        } else if (!simpleSecondName) {
          simpleSecondName = name;
        }
      }

      if (name) {
        if (!anyFirstName) {
          anyFirstName = name;
          anyFirstId = id;
        } else if (!anySecondName) {
          anySecondName = name;
        }
      }
    }
  }

  const firstName = simpleFirstName ?? anyFirstName;
  const secondName = simpleSecondName ?? anySecondName;

  return {
    firstAvailableItemName: firstName,
    firstAvailableItemId: simpleFirstId ?? anyFirstId,
    secondAvailableItemName: secondName,
    firstUnavailableItemName: firstUnavailableName,
    requiredModifier,
    orderingAllowed,
    operationsMessage,
    categoryCount: categories.length,
    itemCount,
  };
}
