import {
  landingMenuTotals,
  type LandingMenuItem,
  type LandingPreviewData,
} from "@/lib/landing-demo-data";

export type ScanConfidence = "high" | "medium" | "low";

export type MenuScanExtractionRow = {
  id: string;
  name: string;
  category: string;
  priceLabel: string;
  confidence: ScanConfidence;
  hint?: string;
};

export type MenuScanModifierGroupPreview = {
  id: string;
  groupName: string;
  attachedTo: string;
  rule: string;
  options: string[];
  confidence: ScanConfidence;
  hint?: string;
};

export type MenuScanPreviewModel = {
  restaurantName: string;
  photo: { label: string; fileName: string; status: "complete" };
  categoryChips: { name: string; count: number }[];
  extractions: MenuScanExtractionRow[];
  modifierGroups: MenuScanModifierGroupPreview[];
  review: { ready: number; review: number; blocking: number };
  stats: { categories: number; items: number; modifiers: number };
  moreItemsCount: number;
};

const MAX_EXTRACTION_ROWS = 5;
const MAX_MODIFIER_GROUPS = 3;

function formatPriceLabel(price: number | null): string {
  if (price == null) return "Price missing";
  return `$${price.toFixed(2)}`;
}

function confidenceForItem(item: LandingMenuItem): ScanConfidence {
  if (item.price == null) return "low";
  if (!item.is_available) return "medium";
  if (item.modifiers.length >= 3) return "medium";
  return "high";
}

function hintForItem(item: LandingMenuItem, confidence: ScanConfidence): string | undefined {
  if (confidence === "low") return "Confirm price before commit";
  if (!item.is_available) return "Check availability with kitchen";
  if (confidence === "medium" && item.modifiers.length >= 3) {
    return "Review modifier list from photo";
  }
  if (item.name.toLowerCase().includes("noodle") && item.price != null) {
    return "Verify price against printed menu";
  }
  return undefined;
}

function modifierRule(groupName: string, optionCount: number): string {
  const lower = groupName.toLowerCase();
  if (lower.includes("spice")) return "Required · pick 1";
  if (lower.includes("protein")) return "Optional · max 1";
  if (optionCount > 2) return `Optional · up to ${optionCount}`;
  return "Optional";
}

export function buildMenuScanPreview(data: LandingPreviewData): MenuScanPreviewModel {
  const stats = landingMenuTotals(data);
  const sortedCategories = [...data.categories].sort((a, b) => a.sort_order - b.sort_order);

  const categoryChips = sortedCategories.map((c) => ({
    name: c.name,
    count: c.items.length,
  }));

  const flatItems = sortedCategories.flatMap((c) =>
    c.items.map((item) => ({ item, category: c.name }))
  );

  const extractions: MenuScanExtractionRow[] = flatItems
    .slice(0, MAX_EXTRACTION_ROWS)
    .map(({ item, category }) => {
      const confidence = confidenceForItem(item);
      return {
        id: item.id,
        name: item.name,
        category,
        priceLabel: formatPriceLabel(item.price),
        confidence,
        hint: hintForItem(item, confidence),
      };
    });

  const modifierGroups: MenuScanModifierGroupPreview[] = [];
  for (const { item } of flatItems) {
    const byGroup = new Map<string, string[]>();
    for (const m of item.modifiers) {
      const list = byGroup.get(m.group_name) ?? [];
      if (!list.includes(m.modifier_name)) list.push(m.modifier_name);
      byGroup.set(m.group_name, list);
    }
    for (const [groupName, options] of byGroup) {
      modifierGroups.push({
        id: `${item.id}-${groupName}`,
        groupName,
        attachedTo: item.name,
        rule: modifierRule(groupName, options.length),
        options,
        confidence: options.length < 2 ? "medium" : "high",
        hint:
          groupName.toLowerCase().includes("spice") && options.length < 3
            ? "Add missing spice levels if on menu"
            : undefined,
      });
    }
  }

  let ready = 0;
  let review = 0;
  let blocking = 0;
  for (const row of extractions) {
    if (row.confidence === "high") ready += 1;
    else if (row.confidence === "medium") review += 1;
    else blocking += 1;
  }

  const slug = data.restaurantName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return {
    restaurantName: data.restaurantName,
    photo: {
      label: "Sample menu photo (demo)",
      fileName: `${slug || "menu"}-wall.jpg`,
      status: "complete",
    },
    categoryChips,
    extractions,
    modifierGroups: modifierGroups.slice(0, MAX_MODIFIER_GROUPS),
    review: { ready, review, blocking },
    stats,
    moreItemsCount: Math.max(0, flatItems.length - MAX_EXTRACTION_ROWS),
  };
}
