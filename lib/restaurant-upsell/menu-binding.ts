import type { DbCategory, DbItem, DbModifier } from "@/lib/types";
import type { RestaurantMenuSnapshot } from "@/lib/menu-editor/load-menu";
import type { RestaurantUpsellRuleInput } from "@/lib/restaurant-upsell/schema";

export type UpsellMenuItemRef = {
  name: string;
  is_available: boolean;
  category_name: string | null;
};

export type UpsellMenuModifierRef = {
  modifier_name: string;
  item_name: string;
};

export type MenuUpsellCatalog = {
  items: UpsellMenuItemRef[];
  modifiers: UpsellMenuModifierRef[];
};

export type PromptReadyUpsellRule = RestaurantUpsellRuleInput & {
  menu_trigger_names: string[];
  menu_offer_names: string[];
};

function normalizedTokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
}

export function upsellTextMatchesMenuName(ruleText: string, menuName: string): boolean {
  const ruleTokens = normalizedTokens(ruleText);
  const menuTokens = normalizedTokens(menuName);
  if (ruleTokens.length === 0 || menuTokens.length === 0) return false;

  const ruleBlob = ruleText.toLowerCase();
  const menuBlob = menuName.toLowerCase();
  if (
    menuTokens.some(
      (token) => token.length >= 4 && ruleBlob.includes(token)
    ) ||
    ruleTokens.some(
      (token) => token.length >= 4 && menuBlob.includes(token)
    )
  ) {
    return true;
  }

  const ruleSet = new Set(ruleTokens);
  const menuSet = new Set(menuTokens);
  const menuInRule = menuTokens.every((token) => ruleSet.has(token));
  const ruleInMenu = ruleTokens.every((token) => menuSet.has(token));
  return menuInRule || ruleInMenu;
}

export function buildMenuUpsellCatalog(
  menu: RestaurantMenuSnapshot
): MenuUpsellCatalog {
  const categoryNameById = new Map(
    menu.categories.map((category: DbCategory) => [category.id, category.name])
  );
  const itemNameById = new Map(
    menu.items.map((item: DbItem) => [item.id, item.name])
  );

  return {
    items: menu.items.map((item) => ({
      name: item.name,
      is_available: item.is_available,
      category_name: categoryNameById.get(item.category_id) ?? null,
    })),
    modifiers: menu.modifiers.map((modifier: DbModifier) => ({
      modifier_name: modifier.modifier_name,
      item_name: itemNameById.get(modifier.item_id) ?? "",
    })),
  };
}

function matchingAvailableItems(
  text: string,
  catalog: MenuUpsellCatalog
): UpsellMenuItemRef[] {
  const matches = catalog.items.filter(
    (item) =>
      item.is_available && upsellTextMatchesMenuName(text, item.name)
  );
  if (matches.length > 0) return matches;

  const modifierMatches = catalog.modifiers.filter((modifier) =>
    upsellTextMatchesMenuName(text, modifier.modifier_name)
  );
  return modifierMatches.map((modifier) => ({
    name: modifier.modifier_name,
    is_available: true,
    category_name: null,
  }));
}

function matchingMenuNames(text: string, catalog: MenuUpsellCatalog): string[] {
  const itemNames = catalog.items
    .filter((item) => upsellTextMatchesMenuName(text, item.name))
    .map((item) => item.name);
  const modifierNames = catalog.modifiers
    .filter((modifier) => upsellTextMatchesMenuName(text, modifier.modifier_name))
    .map((modifier) => modifier.modifier_name);
  return [...new Set([...itemNames, ...modifierNames])];
}

export type UpsellRuleAuditStatus =
  | "ready"
  | "inactive"
  | "unavailable"
  | "not_on_menu";

export type UpsellRuleAudit = {
  status: UpsellRuleAuditStatus;
  message: string;
  menu_offer_names: string[];
};

export function auditUpsellRuleAgainstMenu(
  rule: RestaurantUpsellRuleInput & { is_active?: boolean },
  catalog: MenuUpsellCatalog | null | undefined
): UpsellRuleAudit {
  if (rule.is_active === false) {
    return {
      status: "inactive",
      message: "Inactive — saved but not sent to the phone agent.",
      menu_offer_names: [],
    };
  }

  const offer = rule.offer_text.trim();
  if (!catalog) {
    return {
      status: "not_on_menu",
      message: "Load the live menu to verify this offer matches an available item.",
      menu_offer_names: [],
    };
  }

  const availableOffers = matchingAvailableItems(offer, catalog);
  if (availableOffers.length > 0) {
    return {
      status: "ready",
      message: `Ready for the agent: ${availableOffers.map((item) => item.name).join(", ")}.`,
      menu_offer_names: availableOffers.map((item) => item.name),
    };
  }

  const allMatches = matchingMenuNames(offer, catalog);
  const unavailableItems = catalog.items.filter(
    (item) =>
      !item.is_available && upsellTextMatchesMenuName(offer, item.name)
  );
  if (unavailableItems.length > 0 || allMatches.some((name) =>
    catalog.items.some(
      (item) => item.name === name && !item.is_available
    )
  )) {
    return {
      status: "unavailable",
      message: "Offer matches menu items that are sold out or unavailable — not sent to the agent until back in stock.",
      menu_offer_names: unavailableItems.map((item) => item.name),
    };
  }

  return {
    status: "not_on_menu",
    message: "Offer does not match any live menu item or modifier — fix the wording or add the item to your menu.",
    menu_offer_names: [],
  };
}

export function filterUpsellRulesForPrompt(
  rules: readonly RestaurantUpsellRuleInput[],
  catalog: MenuUpsellCatalog | null | undefined
): PromptReadyUpsellRule[] {
  if (!catalog) return [];

  const ready: PromptReadyUpsellRule[] = [];

  for (const rule of rules) {
    const trigger = rule.trigger_text.trim();
    const offer = rule.offer_text.trim();
    if (!trigger || !offer) continue;

    const offerItems = matchingAvailableItems(offer, catalog);
    if (offerItems.length === 0) continue;

    ready.push({
      trigger_text: trigger,
      offer_text: offer,
      menu_trigger_names: matchingMenuNames(trigger, catalog),
      menu_offer_names: offerItems.map((item) => item.name),
    });
  }

  return ready.slice(0, 20);
}
