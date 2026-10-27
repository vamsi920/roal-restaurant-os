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
import { ChevronDown, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui";
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
    "input-base",
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
    <div className="menu-import-review flex min-w-0 flex-col gap-3">
      <div className="menu-import-review__header rounded-[12px] border border-line bg-elev/60 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[14px] font-semibold text-ink">Review what we read</h3>
            <p className="mt-0.5 text-[12.5px] text-subtle">
              Fix names, prices, and options before they go live on the phone.
            </p>
          </div>
          <div className="menu-import-review__stats flex max-w-full flex-wrap gap-1.5">
            <Badge>{totals.categories} categories</Badge>
            <Badge>{totals.items} items</Badge>
            <Badge>{totals.modifiers} modifiers</Badge>
            {counts.warnings > 0 ? <Badge tone="warn">{counts.warnings} to review</Badge> : null}
            {counts.errors > 0 ? <Badge tone="bad">{counts.errors} blocking</Badge> : null}
          </div>
        </div>

        {hints.length > 0 ? (
          <ul
            className="menu-import-review__hints mt-3 max-h-32 space-y-1 overflow-y-auto overscroll-contain border-t border-line pt-3 text-[13px]"
            aria-label="Review issues"
          >
            {hints.slice(0, 12).map((h) => (
              <li
                key={`${h.path}-${h.message}`}
                className={cn(
                  "flex gap-2 [overflow-wrap:anywhere]",
                  h.severity === "error" ? "text-danger" : "text-[rgb(var(--tile-amber-ink))]"
                )}
              >
                <span
                  className={cn(
                    "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                    h.severity === "error" ? "bg-danger" : "bg-warning"
                  )}
                  aria-hidden
                />
                {h.message}
              </li>
            ))}
            {hints.length > 12 ? (
              <li className="text-subtle">+{hints.length - 12} more…</li>
            ) : null}
          </ul>
        ) : (
          <p className="mt-3 border-t border-line pt-3 text-[12.5px] text-success">
            Nothing flagged — still skim the items before you save.
          </p>
        )}
      </div>

      <div className="menu-import-review__scroll max-h-[min(60vh,560px)] space-y-2 overflow-y-auto overscroll-contain">
        {menu.categories.map((cat, ci) => {
          const catPath = `categories.${ci}`;
          const catHints = hintsForPath(hints, catPath);
          const catOpen = openCats.has(ci);

          return (
            <div
              key={`${cat.name}-${ci}`}
              className="overflow-hidden rounded-[12px] border border-line bg-card"
            >
              <div className="menu-import-review__cat-head flex flex-wrap items-center gap-2 border-b border-line px-3 py-2">
                <button
                  type="button"
                  className="btn-ghost w-9 shrink-0 px-0"
                  onClick={() => toggleCat(ci)}
                  aria-expanded={catOpen}
                  aria-label={catOpen ? `Collapse ${cat.name}` : `Expand ${cat.name}`}
                >
                  <ChevronDown
                    size={15}
                    className={cn(
                      "transition-transform motion-reduce:transition-none",
                      !catOpen && "-rotate-90"
                    )}
                    aria-hidden
                  />
                </button>
                <input
                  className={cn(
                    fieldClass(
                      catHints.some((h) => h.path.endsWith(".name") || h.path === catPath),
                      catHints.some((h) => h.severity === "error")
                    ),
                    "min-w-0 flex-1 basis-[calc(100%-3.25rem)] font-semibold sm:basis-auto"
                  )}
                  aria-label="Category name"
                  value={cat.name}
                  disabled={pending}
                  onChange={(e) =>
                    onChange(updateCategoryName(menu, ci, e.target.value))
                  }
                />
                <span className="text-[12px] text-subtle sm:ml-auto">
                  {cat.items.length} items
                  {cat.confidence === "low" ? " · low confidence" : ""}
                </span>
                <button
                  type="button"
                  className="btn-ghost btn-sm ml-auto text-danger sm:ml-0"
                  disabled={pending || menu.categories.length <= 1}
                  onClick={() => onChange(removeCategory(menu, ci))}
                >
                  Remove
                </button>
              </div>

              {catOpen ? (
                <ul className="divide-y divide-line/70">
                  {cat.items.map((item, ii) => {
                    const itemPath = `${catPath}.items.${ii}`;
                    const itemHints = hintsForPath(hints, itemPath);

                    return (
                      <li key={`${item.name}-${ii}`} className="space-y-2.5 px-3 py-3">
                        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_8rem]">
                          <label className="block min-w-0">
                            <span className="field-label">Item</span>
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
                          <label className="block min-w-0">
                            <span className="field-label">Price</span>
                            <input
                              type="number"
                              step="0.01"
                              min={0}
                              inputMode="decimal"
                              className={cn(
                                fieldClass(
                                  itemHints.some((h) => h.path.endsWith(".price")),
                                  false
                                ),
                                "tabular-nums"
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
                        <label className="block">
                          <span className="field-label">Description</span>
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
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-[13px] text-ink lg:min-h-0">
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-ink"
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
                          </label>
                          <button
                            type="button"
                            className="btn-ghost btn-sm text-danger"
                            disabled={pending}
                            onClick={() => onChange(removeItem(menu, ci, ii))}
                          >
                            <Trash2 size={13} aria-hidden /> Remove item
                          </button>
                        </div>

                        {(item.modifiers?.length ?? 0) > 0 ? (
                          <div className="rounded-[10px] border border-line bg-elev/60 p-2.5">
                            <p className="text-[12px] font-semibold text-muted">
                              Options
                            </p>
                            <ul className="mt-2 space-y-2">
                              {item.modifiers.map((mod, mi) => {
                                const modPath = `${itemPath}.modifiers.${mi}`;
                                const modHints = hintsForPath(hints, modPath);
                                return (
                                  <li
                                    key={`${mod.modifier_name}-${mi}`}
                                    className="grid grid-cols-1 gap-2 sm:grid-cols-3"
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
                                      aria-label="Option group"
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
                                      aria-label="Option name"
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
                                      inputMode="decimal"
                                      className="input-base tabular-nums"
                                      aria-label="Extra price"
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

      <div className="menu-import-review__actions sticky bottom-0 z-10 -mx-1 flex flex-col gap-2 border-t border-line bg-card px-1 pb-1 pt-3 sm:flex-row sm:flex-wrap sm:items-center">
        <button
          type="button"
          className="btn-primary min-h-11 w-full sm:min-h-0 sm:w-auto"
          disabled={pending || counts.errors > 0 || menu.categories.length === 0}
          onClick={onCommit}
        >
          {pending ? "Saving…" : "Add to live menu"}
        </button>
        <button
          type="button"
          className="btn-ghost min-h-11 w-full sm:min-h-0 sm:w-auto"
          disabled={pending}
          onClick={onDiscard}
        >
          Discard import
        </button>
        {counts.errors > 0 ? (
          <p className="text-center text-[12.5px] text-danger sm:text-left" role="alert">
            Fix blocking issues before saving.
          </p>
        ) : null}
      </div>
    </div>
  );
}
