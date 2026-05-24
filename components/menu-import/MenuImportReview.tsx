"use client";

import { useMemo, useState } from "react";
import { buildReviewHints, countHintsBySeverity, hintsForPath } from "@/lib/menu-import/review-hints";
import type { ReviewHint, ScannedMenu } from "@/lib/menu-import/types";
import {
  removeCategory,
  removeItem,
  updateCategoryName,
  updateItemField,
  updateModifierField,
} from "@/lib/menu-import/update-menu";
import { cn } from "@/lib/cn";

type Props = {
  menu: ScannedMenu;
  initialHints?: ReviewHint[];
  pending: boolean;
  onChange: (menu: ScannedMenu) => void;
  onDiscard: () => void;
  onCommit: () => void;
};

function fieldClass(hasIssue: boolean, isError: boolean) {
  return cn(
    "input-base py-1.5 text-sm",
    hasIssue &&
      (isError
        ? "border-danger/50 bg-danger/[0.04] ring-1 ring-danger/30"
        : "border-warning/50 bg-warning/[0.06] ring-1 ring-warning/30")
  );
}

export function MenuImportReview({
  menu,
  pending,
  onChange,
  onDiscard,
  onCommit,
}: Props) {
  const hints = useMemo(() => buildReviewHints(menu), [menu]);
  const counts = useMemo(() => countHintsBySeverity(hints), [hints]);
  const [openCats, setOpenCats] = useState<Set<number>>(
    () => new Set(menu.categories.map((_, i) => i))
  );

  function toggleCat(i: number) {
    setOpenCats((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  const totals = useMemo(
    () => ({
      categories: menu.categories.length,
      items: menu.categories.reduce((n, c) => n + c.items.length, 0),
      modifiers: menu.categories.reduce(
        (n, c) =>
          n + c.items.reduce((m, i) => m + (i.modifiers?.length ?? 0), 0),
        0
      ),
    }),
    [menu]
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-line bg-elev p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-ink">Review extracted menu</h3>
            <p className="mt-1 text-xs text-muted">
              Correct names, prices, and modifiers before saving to your live menu.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px]">
            <span className="rounded-full border border-line bg-card px-2.5 py-1 font-medium text-muted">
              {totals.categories} categories
            </span>
            <span className="rounded-full border border-line bg-card px-2.5 py-1 font-medium text-muted">
              {totals.items} items
            </span>
            <span className="rounded-full border border-line bg-card px-2.5 py-1 font-medium text-muted">
              {totals.modifiers} modifiers
            </span>
            {counts.warnings > 0 ? (
              <span className="rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 font-medium text-warning">
                {counts.warnings} review
              </span>
            ) : null}
            {counts.errors > 0 ? (
              <span className="rounded-full border border-danger/30 bg-danger/10 px-2.5 py-1 font-medium text-danger">
                {counts.errors} blocking
              </span>
            ) : null}
          </div>
        </div>

        {hints.length > 0 ? (
          <ul className="mt-3 max-h-28 space-y-1 overflow-y-auto border-t border-line pt-3 text-[11px]">
            {hints.slice(0, 12).map((h) => (
              <li
                key={`${h.path}-${h.message}`}
                className={cn(
                  h.severity === "error" ? "text-danger" : "text-warning"
                )}
              >
                {h.message}
              </li>
            ))}
            {hints.length > 12 ? (
              <li className="text-subtle">+{hints.length - 12} more…</li>
            ) : null}
          </ul>
        ) : (
          <p className="mt-3 border-t border-line pt-3 text-xs text-success">
            No issues flagged — still skim items before commit.
          </p>
        )}
      </div>

      <div className="max-h-[min(52vh,520px)] space-y-2 overflow-y-auto pr-1">
        {menu.categories.map((cat, ci) => {
          const catPath = `categories.${ci}`;
          const catHints = hintsForPath(hints, catPath);
          const catOpen = openCats.has(ci);

          return (
            <div
              key={`${cat.name}-${ci}`}
              className="rounded-xl border border-line/80 bg-card"
            >
              <div className="flex items-center gap-2 border-b border-line/60 px-3 py-2">
                <button
                  type="button"
                  className="shrink-0 text-subtle hover:text-ink"
                  onClick={() => toggleCat(ci)}
                  aria-expanded={catOpen}
                >
                  {catOpen ? "▼" : "▶"}
                </button>
                <input
                  className={fieldClass(
                    catHints.some((h) => h.path.endsWith(".name") || h.path === catPath),
                    catHints.some((h) => h.severity === "error")
                  )}
                  value={cat.name}
                  disabled={pending}
                  onChange={(e) =>
                    onChange(updateCategoryName(menu, ci, e.target.value))
                  }
                />
                <span className="ml-auto shrink-0 text-[10px] text-subtle">
                  {cat.items.length} items
                  {cat.confidence === "low" ? " · low conf." : ""}
                </span>
                <button
                  type="button"
                  className="text-[10px] text-danger hover:underline"
                  disabled={pending || menu.categories.length <= 1}
                  onClick={() => onChange(removeCategory(menu, ci))}
                >
                  Remove
                </button>
              </div>

              {catOpen ? (
                <ul className="divide-y divide-line/50">
                  {cat.items.map((item, ii) => {
                    const itemPath = `${catPath}.items.${ii}`;
                    const itemHints = hintsForPath(hints, itemPath);

                    return (
                      <li key={`${item.name}-${ii}`} className="space-y-2 px-3 py-3">
                        <div className="grid gap-2 sm:grid-cols-2">
                          <label className="block text-[10px] font-medium uppercase tracking-wider text-subtle">
                            Item
                            <input
                              className={fieldClass(
                                itemHints.some((h) => h.path.endsWith(".name")),
                                itemHints.some(
                                  (h) =>
                                    h.path.endsWith(".name") &&
                                    h.severity === "error"
                                )
                              )}
                              value={item.name}
                              disabled={pending}
                              onChange={(e) =>
                                onChange(
                                  updateItemField(
                                    menu,
                                    ci,
                                    ii,
                                    "name",
                                    e.target.value
                                  )
                                )
                              }
                            />
                          </label>
                          <label className="block text-[10px] font-medium uppercase tracking-wider text-subtle">
                            Price
                            <input
                              type="number"
                              step="0.01"
                              min={0}
                              className={fieldClass(
                                itemHints.some((h) => h.path.endsWith(".price")),
                                false
                              )}
                              value={item.price ?? ""}
                              placeholder="—"
                              disabled={pending}
                              onChange={(e) =>
                                onChange(
                                  updateItemField(
                                    menu,
                                    ci,
                                    ii,
                                    "price",
                                    e.target.value === ""
                                      ? null
                                      : Number(e.target.value)
                                  )
                                )
                              }
                            />
                          </label>
                        </div>
                        <label className="block text-[10px] font-medium uppercase tracking-wider text-subtle">
                          Description
                          <input
                            className={fieldClass(
                              itemHints.some((h) =>
                                h.path.endsWith(".description")
                              ),
                              false
                            )}
                            value={item.description ?? ""}
                            disabled={pending}
                            onChange={(e) =>
                              onChange(
                                updateItemField(
                                  menu,
                                  ci,
                                  ii,
                                  "description",
                                  e.target.value
                                )
                              )
                            }
                          />
                        </label>
                        <label className="flex items-center gap-2 text-xs text-ink">
                          <input
                            type="checkbox"
                            checked={item.base_availability !== false}
                            disabled={pending}
                            onChange={(e) =>
                              onChange(
                                updateItemField(
                                  menu,
                                  ci,
                                  ii,
                                  "base_availability",
                                  e.target.checked
                                )
                              )
                            }
                          />
                          Available
                          <button
                            type="button"
                            className="ml-auto text-[10px] text-danger hover:underline"
                            disabled={pending}
                            onClick={() => onChange(removeItem(menu, ci, ii))}
                          >
                            Remove item
                          </button>
                        </label>

                        {(item.modifiers?.length ?? 0) > 0 ? (
                          <div className="rounded-lg border border-line/60 bg-elev/50 p-2">
                            <p className="text-[10px] font-medium uppercase tracking-wider text-subtle">
                              Modifiers
                            </p>
                            <ul className="mt-2 space-y-2">
                              {item.modifiers.map((mod, mi) => {
                                const modPath = `${itemPath}.modifiers.${mi}`;
                                const modHints = hintsForPath(hints, modPath);
                                return (
                                  <li
                                    key={`${mod.modifier_name}-${mi}`}
                                    className="grid gap-2 sm:grid-cols-3"
                                  >
                                    <input
                                      className={fieldClass(
                                        modHints.length > 0,
                                        modHints.some(
                                          (h) => h.severity === "error"
                                        )
                                      )}
                                      value={mod.group_name}
                                      placeholder="Group"
                                      disabled={pending}
                                      onChange={(e) =>
                                        onChange(
                                          updateModifierField(
                                            menu,
                                            ci,
                                            ii,
                                            mi,
                                            "group_name",
                                            e.target.value
                                          )
                                        )
                                      }
                                    />
                                    <input
                                      className={fieldClass(
                                        modHints.length > 0,
                                        modHints.some(
                                          (h) => h.severity === "error"
                                        )
                                      )}
                                      value={mod.modifier_name}
                                      placeholder="Option"
                                      disabled={pending}
                                      onChange={(e) =>
                                        onChange(
                                          updateModifierField(
                                            menu,
                                            ci,
                                            ii,
                                            mi,
                                            "modifier_name",
                                            e.target.value
                                          )
                                        )
                                      }
                                    />
                                    <input
                                      type="number"
                                      step="0.01"
                                      min={0}
                                      className="input-base py-1.5 text-sm"
                                      value={mod.extra_price}
                                      disabled={pending}
                                      onChange={(e) =>
                                        onChange(
                                          updateModifierField(
                                            menu,
                                            ci,
                                            ii,
                                            mi,
                                            "extra_price",
                                            Number(e.target.value)
                                          )
                                        )
                                      }
                                    />
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
        <button
          type="button"
          className="btn-primary"
          disabled={pending || counts.errors > 0 || menu.categories.length === 0}
          onClick={onCommit}
        >
          {pending ? "Committing…" : "Commit to live menu"}
        </button>
        <button
          type="button"
          className="btn-ghost"
          disabled={pending}
          onClick={onDiscard}
        >
          Discard import
        </button>
        {counts.errors > 0 ? (
          <p className="text-xs text-danger">
            Fix blocking issues before commit.
          </p>
        ) : null}
      </div>
    </div>
  );
}
