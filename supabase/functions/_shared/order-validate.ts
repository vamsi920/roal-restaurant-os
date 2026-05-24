import type {
  MenuItemRow,
  MenuModifierRow,
} from "./load-restaurant-menu.ts";

export type CartLineInput = {
  item_id?: string;
  name?: string;
  quantity?: number | string;
  customizations?: string[];
  notes?: string;
};

export type CartValidationIssue = {
  index: number;
  code: string;
  message: string;
  suggestion: string;
};

export type NormalizedCartLine = {
  item_id: string;
  name: string;
  quantity: number;
  customizations: string[];
  unit_price: number | null;
  is_available: boolean;
  notes: string | null;
};

export type CartValidationResult = {
  ok: boolean;
  issues: CartValidationIssue[];
  normalizedItems: NormalizedCartLine[];
};

type MenuIndex = {
  byId: Map<string, MenuItemRow>;
  byName: Map<string, MenuItemRow>;
  modifiersByItemId: Map<string, MenuModifierRow[]>;
};

const PLACEHOLDER_NAME_RE =
  /^(john|jane)\s+doe$|^test(\s+user)?$|^guest$|^customer$/i;
const PLACEHOLDER_PHONE_RE =
  /^(555[-.\s]?)?0{3,}[-.\s]?0{4}$|^1234567890$|^0000000000$/;

function buildMenuIndex(
  items: MenuItemRow[],
  modifiers: MenuModifierRow[]
): MenuIndex {
  const byId = new Map<string, MenuItemRow>();
  const byName = new Map<string, MenuItemRow>();
  for (const item of items) {
    byId.set(item.id, item);
    byName.set(item.name.trim().toLowerCase(), item);
  }
  const modifiersByItemId = new Map<string, MenuModifierRow[]>();
  for (const mod of modifiers) {
    const list = modifiersByItemId.get(mod.item_id) ?? [];
    list.push(mod);
    modifiersByItemId.set(mod.item_id, list);
  }
  return { byId, byName, modifiersByItemId };
}

function resolveItem(
  line: CartLineInput,
  index: MenuIndex,
  lineIndex: number
): { item: MenuItemRow | null; issues: CartValidationIssue[] } {
  const issues: CartValidationIssue[] = [];
  const id =
    typeof line.item_id === "string" && line.item_id.trim()
      ? line.item_id.trim()
      : null;
  const name =
    typeof line.name === "string" && line.name.trim()
      ? line.name.trim()
      : null;

  if (!id && !name) {
    issues.push({
      index: lineIndex,
      code: "missing_line_identifier",
      message: "Each line needs name or item_id from get_menu_items.",
      suggestion: "Call get_menu_items and use exact names or item_id values.",
    });
    return { item: null, issues };
  }

  let item: MenuItemRow | undefined;
  if (id) {
    item = index.byId.get(id);
    if (!item) {
      issues.push({
        index: lineIndex,
        code: "stale_item_id",
        message: `item_id ${id} is not on the current menu.`,
        suggestion:
          "Call get_menu_items again and use ids from the latest response.",
      });
      return { item: null, issues };
    }
  }

  if (name) {
    const byName = index.byName.get(name.toLowerCase());
    if (!byName) {
      issues.push({
        index: lineIndex,
        code: "unknown_item_name",
        message: `No menu item matches "${name}".`,
        suggestion: "Offer an on-menu alternative from get_menu_items.",
      });
      return { item: null, issues };
    }
    if (item && item.id !== byName.id) {
      issues.push({
        index: lineIndex,
        code: "item_id_name_mismatch",
        message: `item_id and name refer to different items (${item.name} vs ${name}).`,
        suggestion: "Use only item_id or only the exact name from get_menu_items.",
      });
      return { item: null, issues };
    }
    item = item ?? byName;
  }

  return { item: item ?? null, issues };
}

function parseQuantity(
  raw: number | string | undefined,
  lineIndex: number
): { quantity: number | null; issue?: CartValidationIssue } {
  let quantity = 1;
  if (raw === undefined) return { quantity };
  if (typeof raw === "number" && Number.isFinite(raw)) {
    quantity = Math.round(raw);
  } else if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!/^-?\d+$/.test(trimmed)) {
      return {
        quantity: null,
        issue: {
          index: lineIndex,
          code: "invalid_quantity",
          message: "quantity must be a whole number.",
          suggestion: "Ask the guest for a whole number from 1 to 99.",
        },
      };
    }
    quantity = parseInt(trimmed, 10);
  } else {
    return {
      quantity: null,
      issue: {
        index: lineIndex,
        code: "invalid_quantity",
        message: "quantity must be a number.",
        suggestion: "Ask the guest for a whole number from 1 to 99.",
      },
    };
  }
  if (quantity < 1 || quantity > 99) {
    return {
      quantity: null,
      issue: {
        index: lineIndex,
        code: "invalid_quantity",
        message: `quantity must be 1–99 (got ${raw}).`,
        suggestion: "Ask the guest how many they want.",
      },
    };
  }
  return { quantity };
}

function validateModifierGroups(
  item: MenuItemRow,
  customizations: string[],
  modifiers: MenuModifierRow[],
  lineIndex: number
): CartValidationIssue[] {
  const issues: CartValidationIssue[] = [];
  if (modifiers.length === 0) {
    if (customizations.length > 0) {
      issues.push({
        index: lineIndex,
        code: "unknown_modifier",
        message: `${item.name} has no modifiers on the menu.`,
        suggestion: "Remove customizations or pick a different item.",
      });
    }
    return issues;
  }

  const knownByName = new Map(
    modifiers.map((m) => [m.modifier_name.trim().toLowerCase(), m])
  );
  const selected: MenuModifierRow[] = [];

  for (const raw of customizations) {
    const c = raw.trim();
    if (!c) continue;
    const mod = knownByName.get(c.toLowerCase());
    if (!mod) {
      issues.push({
        index: lineIndex,
        code: "unknown_modifier",
        message: `"${c}" is not a modifier for ${item.name}.`,
        suggestion: `Valid options: ${modifiers
          .slice(0, 6)
          .map((m) => m.modifier_name)
          .join(", ")}`,
      });
      continue;
    }
    selected.push(mod);
  }

  const groups = new Map<string, MenuModifierRow[]>();
  for (const m of modifiers) {
    const g = m.group_name?.trim() || "Options";
    const list = groups.get(g) ?? [];
    list.push(m);
    groups.set(g, list);
  }

  for (const [groupName, groupMods] of groups) {
    const minRequired = Math.max(0, ...groupMods.map((m) => m.min_selection ?? 0));
    const maxAllowed = Math.min(
      99,
      groupMods.reduce((max, m) => Math.max(max, m.max_selection ?? 0), 0)
    );
    const pickedInGroup = selected.filter((s) =>
      groupMods.some((g) => g.id === s.id)
    ).length;

    if (minRequired > 0 && pickedInGroup < minRequired) {
      issues.push({
        index: lineIndex,
        code: "required_modifier_missing",
        message: `${item.name} requires at least ${minRequired} choice(s) in "${groupName}".`,
        suggestion: `Ask the guest to choose from: ${groupMods
          .map((m) => m.modifier_name)
          .join(", ")}`,
      });
    }
    if (pickedInGroup > maxAllowed) {
      issues.push({
        index: lineIndex,
        code: "too_many_modifiers",
        message: `${item.name} allows at most ${maxAllowed} choice(s) in "${groupName}".`,
        suggestion: "Remove extra options for that group.",
      });
    }
  }

  return issues;
}

function validateCart(
  items: unknown,
  menuItems: MenuItemRow[],
  menuModifiers: MenuModifierRow[],
  allowEmpty: boolean
): CartValidationResult {
  if (!Array.isArray(items)) {
    return {
      ok: false,
      issues: [
        {
          index: 0,
          code: "invalid_items",
          message: "items must be an array.",
          suggestion: "Pass the full cart as an items array.",
        },
      ],
      normalizedItems: [],
    };
  }

  if (items.length === 0) {
    return allowEmpty
      ? { ok: true, issues: [], normalizedItems: [] }
      : {
          ok: false,
          issues: [
            {
              index: 0,
              code: "empty_cart",
              message: "Cart has no line items.",
              suggestion:
                "Add items from get_menu_items before finalize_order.",
            },
          ],
          normalizedItems: [],
        };
  }

  const index = buildMenuIndex(menuItems, menuModifiers);
  const issues: CartValidationIssue[] = [];
  const normalizedItems: NormalizedCartLine[] = [];

  items.forEach((raw, i) => {
    const line =
      raw && typeof raw === "object"
        ? (raw as CartLineInput)
        : ({} as CartLineInput);

    const { item, issues: resolveIssues } = resolveItem(line, index, i);
    issues.push(...resolveIssues);
    if (!item) return;

    const { quantity, issue: qtyIssue } = parseQuantity(line.quantity, i);
    if (qtyIssue) {
      issues.push(qtyIssue);
      return;
    }
    if (quantity === null) return;

    if (!item.is_available) {
      issues.push({
        index: i,
        code: "item_unavailable",
        message: `${item.name} is sold out or unavailable.`,
        suggestion: "Pick another available item from get_menu_items.",
      });
    }

    if (item.price == null || !Number.isFinite(Number(item.price))) {
      issues.push({
        index: i,
        code: "missing_item_price",
        message: `${item.name} has no menu price configured.`,
        suggestion:
          "Set a price in the menu editor or remove this item from the cart.",
      });
      return;
    }

    const customizations = Array.isArray(line.customizations)
      ? line.customizations.filter(
          (x): x is string => typeof x === "string" && x.trim().length > 0
        )
      : [];

    const mods = index.modifiersByItemId.get(item.id) ?? [];
    issues.push(...validateModifierGroups(item, customizations, mods, i));

    const notes =
      typeof line.notes === "string" && line.notes.trim()
        ? line.notes.trim().slice(0, 500)
        : null;

    normalizedItems.push({
      item_id: item.id,
      name: item.name,
      quantity,
      customizations: customizations.map((c) => c.trim()),
      unit_price: item.price,
      is_available: item.is_available,
      notes,
    });
  });

  return {
    ok: issues.length === 0 && normalizedItems.length > 0,
    issues,
    normalizedItems,
  };
}

export function validateCartForSync(
  items: unknown,
  menuItems: MenuItemRow[],
  menuModifiers: MenuModifierRow[]
): CartValidationResult {
  if (Array.isArray(items) && items.length === 0) {
    return { ok: true, issues: [], normalizedItems: [] };
  }
  return validateCart(items, menuItems, menuModifiers, true);
}

export function validateCartForFinalize(
  items: unknown,
  menuItems: MenuItemRow[],
  menuModifiers: MenuModifierRow[]
): CartValidationResult {
  return validateCart(items, menuItems, menuModifiers, false);
}

export function validateCustomerForFinalize(
  customerName: string,
  customerPhone: string
): { ok: true; customer_name: string; customer_phone: string } | {
  ok: false;
  issues: CartValidationIssue[];
} {
  const issues: CartValidationIssue[] = [];
  const name = customerName.trim();
  const phone = customerPhone.trim();

  if (name.length < 2) {
    issues.push({
      index: -1,
      code: "customer_name_too_short",
      message: "customer_name is too short.",
      suggestion: "Ask the guest for their real name before finalize_order.",
    });
  } else if (PLACEHOLDER_NAME_RE.test(name)) {
    issues.push({
      index: -1,
      code: "placeholder_customer_name",
      message: "customer_name looks like a placeholder.",
      suggestion: "Use only the name the guest said on the call.",
    });
  }

  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) {
    issues.push({
      index: -1,
      code: "customer_phone_invalid",
      message: "customer_phone must include at least 10 digits.",
      suggestion: "Ask for a callback number and read it back in digit groups.",
    });
  } else if (PLACEHOLDER_PHONE_RE.test(phone) || /^(\d)\1{9,}$/.test(digits)) {
    issues.push({
      index: -1,
      code: "placeholder_customer_phone",
      message: "customer_phone looks like a placeholder or example number.",
      suggestion: "Use only the phone number the guest provided.",
    });
  }

  if (issues.length > 0) return { ok: false, issues };
  return { ok: true, customer_name: name, customer_phone: phone };
}

export function formatCartValidationError(
  result: CartValidationResult,
  tool: "sync_draft_order" | "finalize_order"
): Record<string, unknown> {
  const emptyCart = result.issues.some((i) => i.code === "empty_cart");
  const unavailable = result.issues.some((i) => i.code === "item_unavailable");
  const stale = result.issues.some((i) =>
    ["stale_item_id", "unknown_item_name", "item_id_name_mismatch"].includes(
      i.code
    )
  );

  let recovery_hint =
    "Rebuild the cart from the latest get_menu_items response and call the tool again.";
  if (emptyCart) {
    recovery_hint =
      tool === "finalize_order"
        ? "Add menu items with sync_draft_order, then finalize_order with the same session_id."
        : "Pass at least one line item from get_menu_items, or use items: [] only while clearing a draft.";
  } else if (unavailable) {
    recovery_hint =
      "Remove sold-out items and substitute available menu options.";
  } else if (stale) {
    recovery_hint =
      "Call get_menu_items immediately, then replace stale item_id or name values.";
  } else if (tool === "finalize_order") {
    recovery_hint =
      "Fix cart lines, sync_draft_order, then finalize_order with the same session_id.";
  }

  return {
    error: "order_validation_failed",
    code: "order_validation_failed",
    message: `${tool} failed menu validation.`,
    issues: result.issues.map((i) => ({
      path: i.index >= 0 ? `items[${i.index}]` : "order",
      code: i.code,
      message: i.message,
      suggestion: i.suggestion,
    })),
    recovery_hint,
  };
}

export function formatCustomerValidationError(
  issues: CartValidationIssue[]
): Record<string, unknown> {
  return {
    error: "customer_validation_failed",
    code: "customer_validation_failed",
    message: "finalize_order requires authentic guest contact info.",
    issues: issues.map((i) => ({
      path: "customer",
      code: i.code,
      message: i.message,
      suggestion: i.suggestion,
    })),
    recovery_hint:
      "Ask the guest for their real name and callback phone, then call finalize_order again.",
  };
}

export function cartLinesForStorage(
  lines: NormalizedCartLine[]
): Record<string, unknown>[] {
  return lines.map((line) => ({
    item_id: line.item_id,
    name: line.name,
    quantity: line.quantity,
    customizations: line.customizations,
    unit_price: line.unit_price,
    notes: line.notes,
  }));
}
