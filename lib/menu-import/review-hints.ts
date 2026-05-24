import type { ConfidenceLevel, ReviewHint, ScannedMenu } from "@/lib/menu-import/types";
import { menuNamesEqual } from "@/lib/menu-editor/normalize";

function pushHint(
  hints: ReviewHint[],
  path: string,
  message: string,
  severity: ReviewHint["severity"],
  source: ReviewHint["source"]
) {
  if (hints.some((h) => h.path === path)) return;
  hints.push({ path, message, severity, source });
}

function isLow(confidence?: ConfidenceLevel): boolean {
  return confidence === "low";
}

export function buildReviewHints(menu: ScannedMenu): ReviewHint[] {
  const hints: ReviewHint[] = [];

  const categoryNames: string[] = [];

  menu.categories.forEach((cat, ci) => {
    const catPath = `categories.${ci}`;
    if (!cat.name?.trim()) {
      pushHint(hints, `${catPath}.name`, "Category name is empty", "error", "heuristic");
    }
    if (isLow(cat.confidence)) {
      pushHint(
        hints,
        catPath,
        "Model flagged this category as low confidence",
        "warning",
        "model"
      );
    }

    const dupCat = categoryNames.find((n) => menuNamesEqual(n, cat.name));
    if (dupCat) {
      pushHint(
        hints,
        `${catPath}.name`,
        `Duplicate category name (“${dupCat}”)`,
        "warning",
        "heuristic"
      );
    }
    categoryNames.push(cat.name);

    const itemNames: string[] = [];

    cat.items.forEach((item, ii) => {
      const itemPath = `${catPath}.items.${ii}`;
      if (!item.name?.trim()) {
        pushHint(hints, `${itemPath}.name`, "Item name is empty", "error", "heuristic");
      }
      if (item.price == null) {
        pushHint(
          hints,
          `${itemPath}.price`,
          "No price detected — confirm before commit",
          "warning",
          "heuristic"
        );
      }
      if (isLow(item.confidence) || isLow(item.name_confidence)) {
        pushHint(
          hints,
          `${itemPath}.name`,
          "Uncertain item name from scan",
          "warning",
          "model"
        );
      }
      if (isLow(item.price_confidence)) {
        pushHint(
          hints,
          `${itemPath}.price`,
          "Uncertain price from scan",
          "warning",
          "model"
        );
      }
      if (isLow(item.description_confidence) && item.description) {
        pushHint(
          hints,
          `${itemPath}.description`,
          "Uncertain description from scan",
          "warning",
          "model"
        );
      }

      const dupItem = itemNames.find((n) => menuNamesEqual(n, item.name));
      if (dupItem) {
        pushHint(
          hints,
          `${itemPath}.name`,
          `Duplicate item in category (“${dupItem}”)`,
          "warning",
          "heuristic"
        );
      }
      itemNames.push(item.name);

      (item.modifiers ?? []).forEach((mod, mi) => {
        const modPath = `${itemPath}.modifiers.${mi}`;
        if (!mod.modifier_name?.trim()) {
          pushHint(
            hints,
            `${modPath}.modifier_name`,
            "Modifier option name is empty",
            "error",
            "heuristic"
          );
        }
        if (isLow(mod.confidence)) {
          pushHint(
            hints,
            modPath,
            "Uncertain modifier from scan",
            "warning",
            "model"
          );
        }
        if (mod.max_selection < mod.min_selection) {
          pushHint(
            hints,
            modPath,
            "Max selections is less than min",
            "error",
            "heuristic"
          );
        }
      });
    });

    if (cat.items.length === 0) {
      pushHint(
        hints,
        catPath,
        "Category has no items",
        "warning",
        "heuristic"
      );
    }
  });

  if (menu.categories.length === 0) {
    pushHint(hints, "categories", "No categories extracted", "error", "heuristic");
  }

  return hints;
}

export function hintPathsSet(hints: ReviewHint[]): Set<string> {
  return new Set(hints.map((h) => h.path));
}

export function hintsForPath(hints: ReviewHint[], path: string): ReviewHint[] {
  return hints.filter((h) => h.path === path || h.path.startsWith(`${path}.`));
}

export function countHintsBySeverity(hints: ReviewHint[]) {
  return {
    warnings: hints.filter((h) => h.severity === "warning").length,
    errors: hints.filter((h) => h.severity === "error").length,
  };
}
