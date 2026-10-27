"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronUp,
  Pencil,
  Plus,
  ScanLine,
  UtensilsCrossed,
  X,
} from "lucide-react";
import {
  deleteCategoryAction,
  deleteItemAction,
  deleteModifierGroupAction,
  reorderCategoriesAction,
  reorderItemsAction,
  saveCategoryAction,
  saveItemAction,
  saveModifierGroupAction,
} from "./menu-actions";
import {
  ModifierGroupEditor,
  ModifierGroupList,
} from "./ModifierGroupEditor";
import {
  ModifierGroupInputSchema,
  type ModifierGroupInput,
} from "@/lib/menu-editor/modifier-group-schema";
import {
  aggregateModifierGroups,
  findDuplicateGroupInList,
  groupKey,
  type ModifierGroupView,
} from "@/lib/menu-editor/modifier-groups";
import {
  duplicateCategoryMessage,
  duplicateItemMessage,
  findDuplicateCategoryInList,
  findDuplicateItemInList,
} from "@/lib/menu-editor/errors";
import type { RestaurantMenuSnapshot } from "@/lib/menu-editor/load-menu";
import {
  CategoryInputSchema,
  ItemInputSchema,
  formatZodFieldErrors,
  type CategoryInput,
  type ItemInput,
} from "@/lib/menu-editor/validation";
import type { DbCategory, DbItem } from "@/lib/types";
import { notifyMenuChanged } from "@/lib/menu-editor/notify-menu-changed";
import { cn } from "@/lib/cn";
import { Badge, EmptyState } from "@/components/ui";
import { Notice, RealtimeBadge } from "@/components/live-orders/workspace-ui";
import { useLiveMenu } from "../LiveMenuSidebar";
import { Field, ToggleSwitch, formatMenuPrice } from "./menu-ui";

type Props = {
  restaurantId: string;
  restaurantName: string;
  initial: RestaurantMenuSnapshot;
  /** Kept for API compatibility; the Menu page always supplies the shell. */
  embedded?: boolean;
  /** Kept for API compatibility; the board has no section header of its own. */
  hideSectionHeader?: boolean;
  /** Anchor of the scanner section, used by the empty state. */
  scanHref?: string;
};

function parseSortOrderInput(raw: string, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

/** Shared column template for the items header row and item rows (sm and up). */
const ITEM_COLS =
  "sm:grid sm:grid-cols-[minmax(0,1fr)_5.5rem_4.5rem_5.5rem] sm:items-center sm:gap-4";

/**
 * Menu board: categories on the left (chips on mobile), items as rows with price,
 * an availability switch and modifier chips. Rows expand inline to edit the item
 * and its modifier groups. Data comes from useLiveMenu, so realtime changes from
 * the scanner, other tabs, or the phone host appear without a reload.
 */
export function MenuEditor({ restaurantId, initial, scanHref = "#menu-scan" }: Props) {
  const router = useRouter();
  const live = useLiveMenu(
    restaurantId,
    initial.categories,
    initial.items,
    initial.modifiers
  );
  const { categories, setCategories, setItems, setModifiers, flashedIds } = live;
  const items = live.scopedItems;
  const modifiers = live.scopedModifiers;

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    initial.categories[0]?.id ?? null
  );
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [categoryDraft, setCategoryDraft] = useState<CategoryInput | null>(null);
  const [itemDraft, setItemDraft] = useState<ItemInput | null>(null);
  const [modifierGroupDraft, setModifierGroupDraft] =
    useState<ModifierGroupInput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.sort_order - b.sort_order),
    [categories]
  );

  // Fall back to the first category when the selection disappears (delete, realtime, clear).
  const activeCategoryId =
    selectedCategoryId && sortedCategories.some((c) => c.id === selectedCategoryId)
      ? selectedCategoryId
      : sortedCategories[0]?.id ?? null;
  const activeCategory = sortedCategories.find((c) => c.id === activeCategoryId) ?? null;

  const itemCountByCategory = useMemo(() => {
    const counts = new Map<string, number>();
    for (const it of items) counts.set(it.category_id, (counts.get(it.category_id) ?? 0) + 1);
    return counts;
  }, [items]);

  const itemsInCategory = useMemo(() => {
    if (!activeCategoryId) return [];
    return items
      .filter((i) => i.category_id === activeCategoryId)
      .sort(
        (a, b) =>
          (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
          a.name.localeCompare(b.name)
      );
  }, [items, activeCategoryId]);

  const categoryDuplicateHint = useMemo(() => {
    if (!categoryDraft?.name?.trim()) return null;
    const dup = findDuplicateCategoryInList(
      categories,
      categoryDraft.name,
      categoryDraft.id
    );
    return dup ? duplicateCategoryMessage(dup.name) : null;
  }, [categoryDraft, categories]);

  const itemDuplicateHint = useMemo(() => {
    if (!itemDraft?.name?.trim() || !itemDraft.category_id) return null;
    const dup = findDuplicateItemInList(
      items,
      itemDraft.category_id,
      itemDraft.name,
      itemDraft.id
    );
    return dup ? duplicateItemMessage(dup.name) : null;
  }, [itemDraft, items]);

  const modifierGroupsForItem = useMemo(() => {
    if (!expandedItemId) return [];
    return aggregateModifierGroups(modifiers, expandedItemId);
  }, [modifiers, expandedItemId]);

  const modifierGroupDuplicateHint = useMemo(() => {
    if (!modifierGroupDraft?.group_name?.trim() || !modifierGroupDraft.item_id) {
      return null;
    }
    const dup = findDuplicateGroupInList(
      modifierGroupsForItem,
      modifierGroupDraft.item_id,
      modifierGroupDraft.group_name,
      modifierGroupDraft.previous_group_name
    );
    return dup
      ? `Group "${dup.group_name}" already exists on this item.`
      : null;
  }, [modifierGroupDraft, modifierGroupsForItem]);

  function clearMessages() {
    setError(null);
    setFieldErrors({});
  }

  function resetEdits() {
    setCategoryDraft(null);
    setItemDraft(null);
    setModifierGroupDraft(null);
    setExpandedItemId(null);
    clearMessages();
  }

  function afterMenuMutation(noticeText: string) {
    notifyMenuChanged(restaurantId);
    router.refresh();
    setNotice(noticeText);
  }

  function moveCategory(catId: string, delta: -1 | 1) {
    const list = [...sortedCategories];
    const i = list.findIndex((c) => c.id === catId);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    const order = list.map((c, idx) => ({ id: c.id, sort_order: idx + 1 }));
    startTransition(async () => {
      setError(null);
      try {
        await reorderCategoriesAction(restaurantId, { order });
        setCategories((prev) =>
          prev.map((c) => {
            const row = order.find((o) => o.id === c.id);
            return row ? { ...c, sort_order: row.sort_order } : c;
          })
        );
        afterMenuMutation("Category order updated.");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Reorder failed");
      }
    });
  }

  function moveItem(itemId: string, delta: -1 | 1) {
    if (!activeCategoryId) return;
    const categoryId = activeCategoryId;
    const list = [...itemsInCategory];
    const i = list.findIndex((it) => it.id === itemId);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    const order = list.map((it, idx) => ({ id: it.id, sort_order: idx + 1 }));
    startTransition(async () => {
      setError(null);
      try {
        await reorderItemsAction(restaurantId, {
          category_id: categoryId,
          order,
        });
        setItems((prev) =>
          prev.map((it) => {
            const row = order.find((o) => o.id === it.id);
            return row ? { ...it, sort_order: row.sort_order } : it;
          })
        );
        afterMenuMutation("Item order updated.");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Reorder failed");
      }
    });
  }

  function selectCategory(id: string) {
    resetEdits();
    setSelectedCategoryId(id);
  }

  function startEditCategory(cat?: DbCategory) {
    setItemDraft(null);
    setModifierGroupDraft(null);
    setExpandedItemId(null);
    clearMessages();
    if (cat) {
      setCategoryDraft({
        id: cat.id,
        name: cat.name,
        sort_order: cat.sort_order,
      });
    } else {
      setCategoryDraft({ name: "", sort_order: sortedCategories.length + 1 });
    }
  }

  function startEditItem(item?: DbItem) {
    if (!activeCategoryId && !item) return;
    setCategoryDraft(null);
    setModifierGroupDraft(null);
    clearMessages();
    const categoryId = item?.category_id ?? activeCategoryId!;
    if (item) {
      setItemDraft({
        id: item.id,
        category_id: item.category_id,
        name: item.name,
        description: item.description,
        price: item.price,
        is_available: item.is_available,
        sort_order: item.sort_order ?? 1,
      });
      setExpandedItemId(item.id);
    } else {
      setExpandedItemId(null);
      setItemDraft({
        category_id: categoryId,
        name: "",
        description: null,
        price: null,
        is_available: true,
        sort_order: itemsInCategory.length + 1,
      });
    }
  }

  function toggleItemEditor(item: DbItem) {
    if (expandedItemId === item.id) {
      resetEdits();
      return;
    }
    startEditItem(item);
  }

  function startEditModifierGroup(group?: ModifierGroupView) {
    const itemId = group?.item_id ?? expandedItemId;
    if (!itemId) return;
    clearMessages();
    if (group) {
      setModifierGroupDraft({
        item_id: group.item_id,
        previous_group_name: group.group_name,
        group_name: group.group_name,
        is_required: group.is_required,
        min_selection: group.min_selection,
        max_selection: group.max_selection,
        group_sort_order: group.group_sort_order,
        options: group.options.map((o) => ({
          id: o.id,
          modifier_name: o.modifier_name,
          extra_price: o.extra_price,
          sort_order: o.sort_order,
        })),
      });
    } else {
      setModifierGroupDraft({
        item_id: itemId,
        group_name: "",
        is_required: false,
        max_selection: 1,
        group_sort_order: modifierGroupsForItem.length + 1,
        options: [{ modifier_name: "", extra_price: 0, sort_order: 1 }],
      });
    }
  }

  async function toggleAvailability(item: DbItem, next: boolean) {
    setError(null);
    setNotice(null);
    setTogglingIds((prev) => new Set(prev).add(item.id));
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, is_available: next } : i))
    );
    setItemDraft((d) => (d && d.id === item.id ? { ...d, is_available: next } : d));
    try {
      // Reuses the item save action with the row's current fields.
      const res = await saveItemAction(restaurantId, {
        id: item.id,
        category_id: item.category_id,
        name: item.name,
        description: item.description,
        price: item.price,
        is_available: next,
        sort_order: item.sort_order ?? undefined,
      });
      setItems((prev) => prev.map((i) => (i.id === res.item.id ? res.item : i)));
      setNotice(
        next
          ? `${item.name} is available again.`
          : `${item.name} is marked sold out — the phone host won't offer it.`
      );
    } catch (e) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, is_available: item.is_available } : i
        )
      );
      setError(e instanceof Error ? e.message : "Could not update availability");
    } finally {
      setTogglingIds((prev) => {
        const nextSet = new Set(prev);
        nextSet.delete(item.id);
        return nextSet;
      });
    }
  }

  function saveCategory() {
    if (!categoryDraft) return;
    const parsed = CategoryInputSchema.safeParse(categoryDraft);
    if (!parsed.success) {
      setFieldErrors(formatZodFieldErrors(parsed.error));
      setError(parsed.error.issues[0]?.message ?? "Invalid category");
      return;
    }
    if (categoryDuplicateHint) {
      setError(categoryDuplicateHint);
      return;
    }
    startTransition(async () => {
      setError(null);
      setFieldErrors({});
      setNotice(null);
      try {
        const res = await saveCategoryAction(restaurantId, parsed.data);
        setCategories((prev) => {
          const without = prev.filter((c) => c.id !== res.category.id);
          return [...without, res.category].sort(
            (a, b) => a.sort_order - b.sort_order
          );
        });
        setSelectedCategoryId(res.category.id);
        resetEdits();
        afterMenuMutation("Category saved.");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Save failed");
      }
    });
  }

  function deleteCategory() {
    const id = categoryDraft?.id;
    if (!id) return;
    if (!window.confirm("Delete this category and all its items?")) return;
    startTransition(async () => {
      setError(null);
      try {
        await deleteCategoryAction(restaurantId, id);
        setCategories((prev) => prev.filter((c) => c.id !== id));
        setItems((prev) => prev.filter((i) => i.category_id !== id));
        const remaining = sortedCategories.filter((c) => c.id !== id);
        setSelectedCategoryId(remaining[0]?.id ?? null);
        resetEdits();
        afterMenuMutation("Category deleted.");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Delete failed");
      }
    });
  }

  function saveItem() {
    if (!itemDraft) return;
    const parsed = ItemInputSchema.safeParse(itemDraft);
    if (!parsed.success) {
      setFieldErrors(formatZodFieldErrors(parsed.error));
      setError(parsed.error.issues[0]?.message ?? "Invalid item");
      return;
    }
    if (itemDuplicateHint) {
      setError(itemDuplicateHint);
      return;
    }
    startTransition(async () => {
      setError(null);
      setFieldErrors({});
      setNotice(null);
      try {
        const res = await saveItemAction(restaurantId, parsed.data);
        setItems((prev) => {
          const without = prev.filter((i) => i.id !== res.item.id);
          return [...without, res.item];
        });
        setSelectedCategoryId(res.item.category_id);
        resetEdits();
        setNotice("Item saved.");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Save failed");
      }
    });
  }

  function deleteItem() {
    const id = itemDraft?.id;
    if (!id) return;
    if (!window.confirm("Delete this item?")) return;
    startTransition(async () => {
      setError(null);
      try {
        await deleteItemAction(restaurantId, id);
        setItems((prev) => prev.filter((i) => i.id !== id));
        setModifiers((prev) => prev.filter((m) => m.item_id !== id));
        resetEdits();
        afterMenuMutation("Item deleted.");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Delete failed");
      }
    });
  }

  function saveModifierGroup() {
    if (!modifierGroupDraft) return;
    const parsed = ModifierGroupInputSchema.safeParse(modifierGroupDraft);
    if (!parsed.success) {
      setFieldErrors(formatZodFieldErrors(parsed.error));
      setError(parsed.error.issues[0]?.message ?? "Invalid modifier group");
      return;
    }
    if (modifierGroupDuplicateHint) {
      setError(modifierGroupDuplicateHint);
      return;
    }
    startTransition(async () => {
      setError(null);
      setFieldErrors({});
      setNotice(null);
      try {
        const res = await saveModifierGroupAction(restaurantId, parsed.data);
        setModifiers((prev) => {
          const removeKey = groupKey(
            parsed.data.item_id,
            parsed.data.previous_group_name ?? parsed.data.group_name
          );
          const without = prev.filter(
            (m) => groupKey(m.item_id, m.group_name) !== removeKey
          );
          return [...without, ...res.modifiers];
        });
        setModifierGroupDraft(null);
        afterMenuMutation("Modifier group saved.");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Save failed");
      }
    });
  }

  function deleteModifierGroup() {
    const draft = modifierGroupDraft;
    if (!draft?.previous_group_name) return;
    if (!window.confirm("Delete this modifier group?")) return;
    const previousName = draft.previous_group_name;
    startTransition(async () => {
      setError(null);
      try {
        await deleteModifierGroupAction(restaurantId, draft.item_id, previousName);
        const removeKey = groupKey(draft.item_id, previousName);
        setModifiers((prev) =>
          prev.filter((m) => groupKey(m.item_id, m.group_name) !== removeKey)
        );
        setModifierGroupDraft(null);
        afterMenuMutation("Modifier group deleted.");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Delete failed");
      }
    });
  }

  const newItemOpen = Boolean(itemDraft && !itemDraft.id);
  const activeIndex = activeCategory
    ? sortedCategories.findIndex((c) => c.id === activeCategory.id)
    : -1;

  if (sortedCategories.length === 0 && !categoryDraft) {
    return (
      <div className="panel min-w-0">
        <Messages error={error} notice={notice} pending={pending} />
        <EmptyState
          icon={UtensilsCrossed}
          title="Your menu is empty"
          body="Scan a photo of your printed menu, or add your first category by hand. The phone host can only sell what's here."
          action={
            <div className="flex flex-col gap-2 sm:flex-row">
              <a href={scanHref} className="btn-primary">
                <ScanLine size={16} aria-hidden /> Scan a menu
              </a>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => startEditCategory()}
              >
                <Plus size={16} aria-hidden /> Add category
              </button>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div className="menu-editor min-w-0 max-w-full space-y-3">
      <Messages error={error} notice={notice} pending={pending} />
      {live.menuUpdatedVisible ? (
        <Notice tone="info">Menu updated — the phone host uses your latest items.</Notice>
      ) : null}

      <div className="grid min-w-0 gap-4 lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start">
        {/* Categories: chips on mobile, list on desktop */}
        <nav aria-label="Menu categories" className="panel min-w-0 overflow-hidden lg:sticky lg:top-4">
          <div className="panel__head py-2.5">
            <h2 className="panel__title">
              Categories{" "}
              <span className="font-normal tabular-nums text-subtle">{sortedCategories.length}</span>
            </h2>
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() => startEditCategory()}
              disabled={pending || Boolean(categoryDraft && !categoryDraft.id)}
            >
              <Plus size={14} aria-hidden /> Add
            </button>
          </div>
          <ul className="flex gap-1.5 overflow-x-auto overscroll-x-contain p-2 lg:max-h-[calc(100dvh-12rem)] lg:flex-col lg:gap-0.5 lg:overflow-y-auto lg:overflow-x-visible">
            {sortedCategories.map((cat) => {
              const selected = cat.id === activeCategoryId;
              return (
                <li key={cat.id} className="shrink-0 lg:shrink">
                  <button
                    type="button"
                    onClick={() => selectCategory(cat.id)}
                    aria-current={selected ? "true" : undefined}
                    className={cn(
                      "flex min-h-11 w-full min-w-0 items-center justify-between gap-3 whitespace-nowrap rounded-full border px-3.5 text-left text-[13.5px] transition-colors motion-reduce:transition-none lg:min-h-9 lg:rounded-[9px] lg:border-transparent lg:px-3",
                      selected
                        ? "border-ink bg-ink text-white lg:bg-elev lg:text-ink lg:border-transparent font-semibold"
                        : "border-line bg-card text-muted hover:text-ink lg:bg-transparent lg:hover:bg-elev",
                      flashedIds.has(cat.id) && "flash-row"
                    )}
                  >
                    <span className="truncate">{cat.name}</span>
                    <span
                      className={cn(
                        "shrink-0 text-[12px] tabular-nums",
                        selected ? "text-white/70 lg:text-subtle" : "text-subtle"
                      )}
                    >
                      {itemCountByCategory.get(cat.id) ?? 0}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Items */}
        <section
          aria-labelledby="menu-items-heading"
          className="panel min-w-0 overflow-hidden"
        >
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-b border-line px-[1.125rem] py-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <h2 id="menu-items-heading" className="truncate text-[14px] font-semibold text-ink">
                {activeCategory?.name ?? "New category"}
              </h2>
              {activeCategory ? (
                <span className="text-[12.5px] tabular-nums text-subtle">
                  {itemsInCategory.length} item{itemsInCategory.length === 1 ? "" : "s"}
                </span>
              ) : null}
              <RealtimeBadge state={live.menuRealtime} className="hidden sm:inline-flex" />
            </div>
            {activeCategory ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  className="btn-ghost btn-sm w-[1.875rem] px-0"
                  aria-label={`Move ${activeCategory.name} up`}
                  disabled={pending || activeIndex <= 0}
                  onClick={() => moveCategory(activeCategory.id, -1)}
                >
                  <ChevronUp size={15} aria-hidden />
                </button>
                <button
                  type="button"
                  className="btn-ghost btn-sm w-[1.875rem] px-0"
                  aria-label={`Move ${activeCategory.name} down`}
                  disabled={pending || activeIndex === sortedCategories.length - 1}
                  onClick={() => moveCategory(activeCategory.id, 1)}
                >
                  <ChevronDown size={15} aria-hidden />
                </button>
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  disabled={pending}
                  onClick={() => startEditCategory(activeCategory)}
                >
                  <Pencil size={13} aria-hidden /> Rename
                </button>
                <button
                  type="button"
                  className="btn-primary btn-sm"
                  disabled={pending || newItemOpen}
                  onClick={() => startEditItem()}
                >
                  <Plus size={14} aria-hidden /> Add item
                </button>
              </div>
            ) : null}
          </div>

          {categoryDraft ? (
            <div className="border-b border-line bg-elev/60 px-[1.125rem] py-4">
              <CategoryForm
                draft={categoryDraft}
                pending={pending}
                isNew={!categoryDraft.id}
                duplicateHint={categoryDuplicateHint}
                fieldErrors={fieldErrors}
                onChange={setCategoryDraft}
                onCancel={resetEdits}
                onDelete={categoryDraft.id ? deleteCategory : undefined}
                onSave={saveCategory}
              />
            </div>
          ) : null}

          {newItemOpen && itemDraft ? (
            <div className="border-b border-line bg-elev/60 px-[1.125rem] py-4">
              <p className="mb-3 text-[13px] font-semibold text-ink">New item</p>
              <ItemForm
                draft={itemDraft}
                categories={sortedCategories}
                pending={pending}
                isNew
                duplicateHint={itemDuplicateHint}
                fieldErrors={fieldErrors}
                onChange={setItemDraft}
                onCancel={resetEdits}
                onSave={saveItem}
              />
            </div>
          ) : null}

          {activeCategory && itemsInCategory.length === 0 && !newItemOpen ? (
            <EmptyState
              icon={UtensilsCrossed}
              title={`No items in ${activeCategory.name}`}
              body="Add the dishes guests can order from this category."
              action={
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={pending}
                  onClick={() => startEditItem()}
                >
                  <Plus size={16} aria-hidden /> Add item
                </button>
              }
            />
          ) : null}

          {itemsInCategory.length > 0 ? (
            <>
              <div
                className={cn(
                  "hidden border-b border-line px-[1.125rem] py-2 text-[11.5px] font-medium text-subtle",
                  ITEM_COLS
                )}
                aria-hidden
              >
                <span>Item</span>
                <span className="text-right">Price</span>
                <span className="text-center">Available</span>
                <span />
              </div>
              <ul>
                {itemsInCategory.map((item, itemIdx) => {
                  const groups = aggregateModifierGroups(modifiers, item.id);
                  const expanded = expandedItemId === item.id;
                  const toggling = togglingIds.has(item.id);
                  const editorId = `menu-item-editor-${item.id}`;
                  return (
                    <li
                        key={item.id}
                        className={cn(
                          "border-b border-line/70 last:border-b-0",
                          expanded && "bg-elev/50",
                          flashedIds.has(item.id) && "flash-row"
                        )}
                      >
                        <div
                          className={cn(
                            "flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 px-[1.125rem] py-3",
                            ITEM_COLS
                          )}
                        >
                          <div className="min-w-0 basis-full sm:basis-auto">
                            <div className="flex min-w-0 items-center gap-2">
                              <span
                                className={cn(
                                  "min-w-0 truncate text-[14px] font-medium",
                                  item.is_available ? "text-ink" : "text-subtle"
                                )}
                              >
                                {item.name}
                              </span>
                              {!item.is_available ? (
                                <Badge tone="warn" className="shrink-0">Sold out</Badge>
                              ) : null}
                            </div>
                            {item.description ? (
                              <p className="mt-0.5 truncate text-[12.5px] text-subtle" title={item.description}>
                                {item.description}
                              </p>
                            ) : null}
                            {groups.length > 0 ? (
                              <div className="mt-1.5 flex min-w-0 flex-wrap gap-1">
                                {groups.slice(0, 3).map((g) => (
                                  <Badge key={g.group_name} className="max-w-[10rem] truncate">
                                    {g.group_name}
                                  </Badge>
                                ))}
                                {groups.length > 3 ? <Badge>+{groups.length - 3}</Badge> : null}
                              </div>
                            ) : null}
                          </div>
                          <span className="mr-auto text-[14px] font-medium tabular-nums text-ink sm:mr-0 sm:text-right">
                            {formatMenuPrice(item.price)}
                          </span>
                          <span className="flex sm:justify-center">
                            <ToggleSwitch
                              checked={item.is_available}
                              busy={toggling}
                              disabled={pending || toggling}
                              label={`${item.name} available for ordering`}
                              onChange={(next) => void toggleAvailability(item, next)}
                            />
                          </span>
                          <span className="flex sm:justify-end">
                            <button
                              type="button"
                              className={cn("btn-ghost btn-sm", expanded && "border-line-strong bg-elev")}
                              aria-expanded={expanded}
                              aria-controls={editorId}
                              aria-label={expanded ? `Close ${item.name}` : `Edit ${item.name}`}
                              disabled={pending && !expanded}
                              onClick={() => toggleItemEditor(item)}
                            >
                              {expanded ? <X size={13} aria-hidden /> : <Pencil size={13} aria-hidden />}
                              {expanded ? "Close" : "Edit"}
                            </button>
                          </span>
                        </div>

                        {expanded ? (
                          <div
                            id={editorId}
                            className="grid min-w-0 gap-5 border-t border-line/70 px-[1.125rem] pb-5 pt-4 xl:grid-cols-2"
                          >
                            <div className="min-w-0">
                              <div className="mb-3 flex items-center justify-between gap-2">
                                <p className="text-[13px] font-semibold text-ink">Item details</p>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    className="btn-ghost btn-sm w-[1.875rem] px-0"
                                    aria-label="Move item up"
                                    disabled={pending || itemIdx === 0}
                                    onClick={() => moveItem(item.id, -1)}
                                  >
                                    <ChevronUp size={15} aria-hidden />
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-ghost btn-sm w-[1.875rem] px-0"
                                    aria-label="Move item down"
                                    disabled={pending || itemIdx === itemsInCategory.length - 1}
                                    onClick={() => moveItem(item.id, 1)}
                                  >
                                    <ChevronDown size={15} aria-hidden />
                                  </button>
                                </div>
                              </div>
                              {itemDraft && itemDraft.id === item.id ? (
                                <ItemForm
                                  draft={itemDraft}
                                  categories={sortedCategories}
                                  pending={pending}
                                  isNew={false}
                                  duplicateHint={itemDuplicateHint}
                                  fieldErrors={fieldErrors}
                                  onChange={setItemDraft}
                                  onCancel={resetEdits}
                                  onDelete={deleteItem}
                                  onSave={saveItem}
                                />
                              ) : null}
                            </div>
                            <div className="min-w-0 xl:border-l xl:border-line xl:pl-5">
                              {modifierGroupDraft && modifierGroupDraft.item_id === item.id ? (
                                <ModifierGroupEditor
                                  draft={modifierGroupDraft}
                                  pending={pending}
                                  isNew={!modifierGroupDraft.previous_group_name}
                                  duplicateHint={modifierGroupDuplicateHint}
                                  fieldErrors={fieldErrors}
                                  onChange={setModifierGroupDraft}
                                  onCancel={() => {
                                    setModifierGroupDraft(null);
                                    clearMessages();
                                  }}
                                  onDelete={
                                    modifierGroupDraft.previous_group_name
                                      ? deleteModifierGroup
                                      : undefined
                                  }
                                  onSave={saveModifierGroup}
                                />
                              ) : (
                                <ModifierGroupList
                                  groups={modifierGroupsForItem}
                                  pending={pending}
                                  onAdd={() => startEditModifierGroup()}
                                  onEdit={(group) => startEditModifierGroup(group)}
                                />
                              )}
                            </div>
                          </div>
                        ) : null}
                      </li>
                  );
                })}
              </ul>
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function Messages({
  error,
  notice,
  pending,
}: {
  error: string | null;
  notice: string | null;
  pending: boolean;
}) {
  return (
    <>
      {error ? (
        <Notice tone="bad" role="alert">
          {error}
        </Notice>
      ) : null}
      {notice && !error ? (
        <Notice tone="ok" role="status">
          {notice}
        </Notice>
      ) : null}
      <p className="sr-only" aria-live="polite">
        {pending ? "Saving…" : ""}
      </p>
    </>
  );
}

function CategoryForm({
  draft,
  pending,
  isNew,
  duplicateHint,
  fieldErrors,
  onChange,
  onCancel,
  onSave,
  onDelete,
}: {
  draft: CategoryInput;
  pending: boolean;
  isNew: boolean;
  duplicateHint: string | null;
  fieldErrors: Record<string, string>;
  onChange: (d: CategoryInput) => void;
  onCancel: () => void;
  onSave: () => void;
  onDelete?: () => void;
}) {
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }}
    >
      <p className="text-[13px] font-semibold text-ink">
        {isNew ? "New category" : "Edit category"}
      </p>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem]">
        <Field label="Name" required error={fieldErrors.name ?? duplicateHint}>
          <input
            className="input-base"
            value={draft.name}
            required
            autoFocus
            disabled={pending}
            placeholder="Appetizers"
            onChange={(e) => onChange({ ...draft, name: e.target.value })}
          />
        </Field>
        <Field label="Sort order" error={fieldErrors.sort_order}>
          <input
            type="number"
            className="input-base tabular-nums"
            value={draft.sort_order}
            min={0}
            disabled={pending}
            onChange={(e) =>
              onChange({
                ...draft,
                sort_order: parseSortOrderInput(e.target.value, draft.sort_order),
              })
            }
          />
        </Field>
      </div>
      <FormActions
        pending={pending}
        isNew={isNew}
        onCancel={onCancel}
        onDelete={onDelete}
        deleteLabel="Delete category"
      />
    </form>
  );
}

function ItemForm({
  draft,
  categories,
  pending,
  isNew,
  duplicateHint,
  fieldErrors,
  onChange,
  onCancel,
  onSave,
  onDelete,
}: {
  draft: ItemInput;
  categories: DbCategory[];
  pending: boolean;
  isNew: boolean;
  duplicateHint: string | null;
  fieldErrors: Record<string, string>;
  onChange: (d: ItemInput) => void;
  onCancel: () => void;
  onSave: () => void;
  onDelete?: () => void;
}) {
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" required error={fieldErrors.name ?? duplicateHint}>
          <input
            className="input-base"
            value={draft.name}
            required
            autoFocus={isNew}
            disabled={pending}
            onChange={(e) => onChange({ ...draft, name: e.target.value })}
          />
        </Field>
        <Field label="Category" error={fieldErrors.category_id}>
          <select
            className="input-base"
            value={draft.category_id}
            disabled={pending}
            onChange={(e) => onChange({ ...draft, category_id: e.target.value })}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field
        label="Description"
        error={fieldErrors.description}
        hint="The phone host reads this when guests ask what's in it."
      >
        <textarea
          className="input-base min-h-[72px] resize-y"
          value={draft.description ?? ""}
          disabled={pending}
          onChange={(e) =>
            onChange({
              ...draft,
              description: e.target.value || null,
            })
          }
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Price (USD)" error={fieldErrors.price}>
          <input
            type="number"
            step="0.01"
            min={0}
            inputMode="decimal"
            className="input-base tabular-nums"
            value={draft.price ?? ""}
            disabled={pending}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === "") {
                onChange({ ...draft, price: null });
                return;
              }
              const n = Number(raw);
              if (Number.isFinite(n)) {
                onChange({ ...draft, price: n });
              }
            }}
          />
        </Field>
        <Field label="Sort order" error={fieldErrors.sort_order}>
          <input
            type="number"
            min={0}
            className="input-base tabular-nums"
            value={draft.sort_order ?? 1}
            disabled={pending}
            onChange={(e) =>
              onChange({
                ...draft,
                sort_order: parseSortOrderInput(e.target.value, draft.sort_order ?? 1),
              })
            }
          />
        </Field>
      </div>
      <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-[13.5px] text-ink lg:min-h-0">
        <input
          type="checkbox"
          className="h-4 w-4 accent-ink"
          checked={draft.is_available}
          disabled={pending}
          onChange={(e) => onChange({ ...draft, is_available: e.target.checked })}
        />
        Available for ordering
      </label>
      <FormActions
        pending={pending}
        isNew={isNew}
        onCancel={onCancel}
        onDelete={onDelete}
        deleteLabel="Delete item"
      />
    </form>
  );
}

function FormActions({
  pending,
  isNew,
  onCancel,
  onDelete,
  deleteLabel = "Delete",
}: {
  pending: boolean;
  isNew: boolean;
  onCancel: () => void;
  onDelete?: () => void;
  deleteLabel?: string;
}) {
  return (
    <div className="flex flex-col gap-2 border-t border-line pt-3 sm:flex-row sm:flex-wrap sm:items-center">
      <button type="submit" className="btn-primary w-full sm:w-auto" disabled={pending}>
        {pending ? "Saving…" : isNew ? "Create" : "Save"}
      </button>
      <button
        type="button"
        className="btn-ghost w-full sm:w-auto"
        disabled={pending}
        onClick={onCancel}
      >
        Cancel
      </button>
      {onDelete ? (
        <button
          type="button"
          className="btn-danger w-full sm:ml-auto sm:w-auto"
          disabled={pending}
          onClick={onDelete}
        >
          {deleteLabel}
        </button>
      ) : null}
    </div>
  );
}
