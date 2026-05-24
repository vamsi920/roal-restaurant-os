"use client";

import { useLayoutEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

type Props = {
  restaurantId: string;
  restaurantName: string;
  initial: RestaurantMenuSnapshot;
};

type EditKind = "category" | "item" | "modifier-group" | null;

function menuKey(
  restaurantId: string,
  snap: RestaurantMenuSnapshot
): string {
  const c = snap.categories.map((x) => x.id).sort().join(",");
  const i = snap.items.map((x) => x.id).sort().join(",");
  const m = snap.modifiers.map((x) => x.id).sort().join(",");
  return `${restaurantId}|${c}|${i}|${m}`;
}

function formatPrice(value: number | null): string {
  if (value == null) return "—";
  return `$${value.toFixed(2)}`;
}

function parseSortOrderInput(raw: string, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export function MenuEditor({ restaurantId, restaurantName, initial }: Props) {
  const router = useRouter();
  const [categories, setCategories] = useState(initial.categories);
  const [items, setItems] = useState(initial.items);
  const [modifiers, setModifiers] = useState(initial.modifiers);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    initial.categories[0]?.id ?? null
  );
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [editKind, setEditKind] = useState<EditKind>(null);
  const [categoryDraft, setCategoryDraft] = useState<CategoryInput | null>(null);
  const [itemDraft, setItemDraft] = useState<ItemInput | null>(null);
  const [modifierGroupDraft, setModifierGroupDraft] =
    useState<ModifierGroupInput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const serverKey = useMemo(
    () => menuKey(restaurantId, initial),
    [restaurantId, initial]
  );

  useLayoutEffect(() => {
    setCategories(initial.categories);
    setItems(initial.items);
    setModifiers(initial.modifiers);
    setSelectedCategoryId(initial.categories[0]?.id ?? null);
    setSelectedItemId(null);
    setEditKind(null);
    setCategoryDraft(null);
    setItemDraft(null);
    setModifierGroupDraft(null);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverKey]);

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.sort_order - b.sort_order),
    [categories]
  );

  const itemsInCategory = useMemo(() => {
    if (!selectedCategoryId) return [];
    return items
      .filter((i) => i.category_id === selectedCategoryId)
      .sort(
        (a, b) =>
          (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
          a.name.localeCompare(b.name)
      );
  }, [items, selectedCategoryId]);

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
    if (!selectedItemId) return [];
    return aggregateModifierGroups(modifiers, selectedItemId);
  }, [modifiers, selectedItemId]);

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

  const selectedCategory = sortedCategories.find((c) => c.id === selectedCategoryId);
  const selectedItem = items.find((i) => i.id === selectedItemId);

  function resetEdits() {
    setEditKind(null);
    setCategoryDraft(null);
    setItemDraft(null);
    setModifierGroupDraft(null);
    setError(null);
    setFieldErrors({});
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
    if (!selectedCategoryId) return;
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
          category_id: selectedCategoryId,
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
    setSelectedItemId(null);
  }

  function selectItem(id: string) {
    resetEdits();
    setSelectedItemId(id);
  }

  function startEditCategory(cat?: DbCategory) {
    setEditKind("category");
    setSelectedItemId(null);
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
    if (!selectedCategoryId && !item) return;
    setEditKind("item");
    const categoryId = item?.category_id ?? selectedCategoryId!;
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
      setSelectedItemId(item.id);
    } else {
      setSelectedItemId(null);
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

  function startEditModifierGroup(group?: ModifierGroupView) {
    const itemId = group?.item_id ?? selectedItemId;
    if (!itemId) return;
    setEditKind("modifier-group");
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

  function cancelEdit() {
    resetEdits();
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2 overflow-x-auto text-sm">
            <Link
              href="/dashboard/restaurants"
              className="shrink-0 text-muted hover:text-ink"
            >
              Restaurants
            </Link>
            <span className="shrink-0 text-subtle">/</span>
            <Link
              href={`/dashboard/restaurants/${restaurantId}`}
              className="shrink-0 truncate text-muted hover:text-ink"
            >
              {restaurantName}
            </Link>
            <span className="shrink-0 text-subtle">/</span>
            <span className="truncate font-medium text-ink">Menu editor</span>
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Menu editor
          </h1>
          <p className="mt-1 text-sm text-muted">
            Edit categories, items, and modifiers. Changes sync to the live KDS sidebar.
          </p>
        </div>
        <Link
          href={`/dashboard/restaurants/${restaurantId}`}
          className="btn-ghost shrink-0 text-sm"
        >
          Back to KDS console
        </Link>
      </div>

      {error ? (
        <p
          className="rounded-lg border border-danger/25 bg-danger/5 px-3 py-2 text-sm text-danger"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      {notice && !error ? (
        <p
          className="rounded-lg border border-success/25 bg-success/5 px-3 py-2 text-sm text-success"
          role="status"
        >
          {notice}
        </p>
      ) : null}
      {pending ? (
        <p className="text-xs text-muted" aria-live="polite">
          Saving…
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
        <section className="glass-card flex flex-col overflow-hidden lg:col-span-3">
          <PanelHeader
            title="Categories"
            count={sortedCategories.length}
            actionLabel="Add"
            onAction={() => startEditCategory()}
            actionDisabled={pending || editKind === "category"}
          />
          <div className="max-h-[min(40vh,320px)] flex-1 overflow-y-auto p-2 lg:max-h-[calc(100dvh-14rem)]">
            {sortedCategories.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-muted">
                No categories yet. Add one or scan a menu on the KDS page.
              </p>
            ) : (
              <ul className="space-y-0.5">
                {sortedCategories.map((cat, catIdx) => (
                  <li key={cat.id} className="flex items-stretch gap-0.5">
                    <div className="flex shrink-0 flex-col justify-center gap-0.5 px-0.5">
                      <button
                        type="button"
                        aria-label="Move category up"
                        className="inline-flex min-h-10 min-w-10 items-center justify-center rounded text-xs text-subtle hover:bg-accent-soft hover:text-ink disabled:opacity-30"
                        disabled={pending || catIdx === 0}
                        onClick={() => moveCategory(cat.id, -1)}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        aria-label="Move category down"
                        className="inline-flex min-h-10 min-w-10 items-center justify-center rounded text-xs text-subtle hover:bg-accent-soft hover:text-ink disabled:opacity-30"
                        disabled={
                          pending || catIdx === sortedCategories.length - 1
                        }
                        onClick={() => moveCategory(cat.id, 1)}
                      >
                        ↓
                      </button>
                    </div>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => selectCategory(cat.id)}
                      className={cn(
                        "flex min-w-0 flex-1 items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors",
                        selectedCategoryId === cat.id
                          ? "bg-accent-soft text-ink"
                          : "hover:bg-accent-soft/50 text-ink"
                      )}
                    >
                      <span className="truncate font-medium">{cat.name}</span>
                      <span className="ml-2 shrink-0 font-mono-tabular text-[11px] text-subtle">
                        {items.filter((i) => i.category_id === cat.id).length}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {selectedCategory && editKind !== "category" ? (
            <div className="border-t border-line px-3 py-2">
              <button
                type="button"
                className="text-xs font-medium text-muted hover:text-ink"
                disabled={pending}
                onClick={() => startEditCategory(selectedCategory)}
              >
                Edit category
              </button>
            </div>
          ) : null}
          {editKind === "category" && categoryDraft ? (
            <CategoryForm
              draft={categoryDraft}
              pending={pending}
              isNew={!categoryDraft.id}
              duplicateHint={categoryDuplicateHint}
              fieldErrors={fieldErrors}
              onChange={setCategoryDraft}
              onCancel={cancelEdit}
              onDelete={
                categoryDraft.id
                  ? () => {
                      if (
                        !window.confirm(
                          "Delete this category and all its items?"
                        )
                      ) {
                        return;
                      }
                      startTransition(async () => {
                        setError(null);
                        try {
                          await deleteCategoryAction(
                            restaurantId,
                            categoryDraft.id!
                          );
                          setCategories((prev) =>
                            prev.filter((c) => c.id !== categoryDraft.id)
                          );
                          setItems((prev) =>
                            prev.filter((i) => i.category_id !== categoryDraft.id)
                          );
                          const remaining = categories.filter(
                            (c) => c.id !== categoryDraft.id
                          );
                          setSelectedCategoryId(remaining[0]?.id ?? null);
                          setSelectedItemId(null);
                          resetEdits();
                          afterMenuMutation("Category deleted.");
                        } catch (e) {
                          setError(e instanceof Error ? e.message : "Delete failed");
                        }
                      });
                    }
                  : undefined
              }
              onSave={() => {
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
                    const res = await saveCategoryAction(
                      restaurantId,
                      parsed.data
                    );
                    setCategories((prev) => {
                      const without = prev.filter(
                        (c) => c.id !== res.category.id
                      );
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
              }}
            />
          ) : null}
        </section>

        <section className="glass-card flex flex-col overflow-hidden lg:col-span-4">
          <PanelHeader
            title="Items"
            count={itemsInCategory.length}
            actionLabel="Add item"
            onAction={() => startEditItem()}
            actionDisabled={
              pending || !selectedCategoryId || editKind === "item"
            }
          />
          <div className="max-h-[min(40vh,320px)] flex-1 overflow-y-auto p-2 lg:max-h-[calc(100dvh-14rem)]">
            {!selectedCategoryId ? (
              <p className="px-3 py-6 text-center text-xs text-muted">
                Select a category.
              </p>
            ) : itemsInCategory.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-muted">
                No items in this category.
              </p>
            ) : (
              <ul className="space-y-0.5">
                {itemsInCategory.map((item, itemIdx) => (
                  <li key={item.id} className="flex items-stretch gap-0.5">
                    <div className="flex shrink-0 flex-col justify-center gap-0.5 px-0.5">
                      <button
                        type="button"
                        aria-label="Move item up"
                        className="inline-flex min-h-10 min-w-10 items-center justify-center rounded text-xs text-subtle hover:bg-accent-soft hover:text-ink disabled:opacity-30"
                        disabled={pending || itemIdx === 0}
                        onClick={() => moveItem(item.id, -1)}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        aria-label="Move item down"
                        className="inline-flex min-h-10 min-w-10 items-center justify-center rounded text-xs text-subtle hover:bg-accent-soft hover:text-ink disabled:opacity-30"
                        disabled={
                          pending || itemIdx === itemsInCategory.length - 1
                        }
                        onClick={() => moveItem(item.id, 1)}
                      >
                        ↓
                      </button>
                    </div>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => selectItem(item.id)}
                      className={cn(
                        "flex min-w-0 flex-1 items-start justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
                        selectedItemId === item.id
                          ? "bg-accent-soft text-ink"
                          : "hover:bg-accent-soft/50"
                      )}
                    >
                      <span className="min-w-0">
                        <span className="flex items-center gap-2">
                          <span
                            className={cn(
                              "h-1.5 w-1.5 shrink-0 rounded-full",
                              item.is_available ? "bg-success" : "bg-subtle"
                            )}
                          />
                          <span className="truncate font-medium">{item.name}</span>
                        </span>
                        {item.description ? (
                          <span className="mt-0.5 line-clamp-1 block pl-3.5 text-[11px] text-subtle">
                            {item.description}
                          </span>
                        ) : null}
                      </span>
                      <span className="shrink-0 font-mono-tabular text-xs text-muted">
                        {formatPrice(item.price)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="glass-card flex flex-col overflow-hidden lg:col-span-5">
          <PanelHeader
            title={selectedItem ? selectedItem.name : "Item details"}
            count={modifierGroupsForItem.length}
            actionLabel="Add group"
            onAction={() => startEditModifierGroup()}
            actionDisabled={
              pending || !selectedItemId || editKind === "modifier-group"
            }
          />
          <div className="flex-1 overflow-y-auto p-4">
            {!selectedItem && editKind !== "item" ? (
              <p className="text-sm text-muted">
                Select an item to edit details and modifiers.
              </p>
            ) : null}

            {editKind === "item" && itemDraft ? (
              <ItemForm
                draft={itemDraft}
                categories={sortedCategories}
                pending={pending}
                isNew={!itemDraft.id}
                duplicateHint={itemDuplicateHint}
                fieldErrors={fieldErrors}
                onChange={setItemDraft}
                onCancel={cancelEdit}
                onDelete={
                  itemDraft.id
                    ? () => {
                        if (!window.confirm("Delete this item?")) return;
                        startTransition(async () => {
                          setError(null);
                          try {
                            await deleteItemAction(restaurantId, itemDraft.id!);
                            setItems((prev) =>
                              prev.filter((i) => i.id !== itemDraft.id)
                            );
                            setModifiers((prev) =>
                              prev.filter((m) => m.item_id !== itemDraft.id)
                            );
                            setSelectedItemId(null);
                            resetEdits();
                            afterMenuMutation("Item deleted.");
                          } catch (e) {
                            setError(
                              e instanceof Error ? e.message : "Delete failed"
                            );
                          }
                        });
                      }
                    : undefined
                }
                onSave={() => {
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
                      const res = await saveItemAction(
                        restaurantId,
                        parsed.data
                      );
                      setItems((prev) => {
                        const without = prev.filter(
                          (i) => i.id !== res.item.id
                        );
                        return [...without, res.item];
                      });
                      setSelectedItemId(res.item.id);
                      setSelectedCategoryId(res.item.category_id);
                      resetEdits();
                      setNotice("Item saved.");
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "Save failed");
                    }
                  });
                }}
              />
            ) : selectedItem && editKind !== "modifier-group" ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-ink">
                      {selectedItem.name}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      {formatPrice(selectedItem.price)}
                      {!selectedItem.is_available ? " · Unavailable" : ""}
                    </p>
                    {selectedItem.description ? (
                      <p className="mt-2 text-sm text-subtle">
                        {selectedItem.description}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="btn-ghost shrink-0 text-xs"
                    disabled={pending}
                    onClick={() => startEditItem(selectedItem)}
                  >
                    Edit item
                  </button>
                </div>

                <ModifierGroupList
                  groups={modifierGroupsForItem}
                  pending={pending}
                  onAdd={() => startEditModifierGroup()}
                  onEdit={(group) => startEditModifierGroup(group)}
                />
              </div>
            ) : null}

            {editKind === "modifier-group" && modifierGroupDraft ? (
              <ModifierGroupEditor
                draft={modifierGroupDraft}
                pending={pending}
                isNew={!modifierGroupDraft.previous_group_name}
                duplicateHint={modifierGroupDuplicateHint}
                fieldErrors={fieldErrors}
                onChange={setModifierGroupDraft}
                onCancel={cancelEdit}
                onDelete={
                  modifierGroupDraft.previous_group_name
                    ? () => {
                        if (!window.confirm("Delete this modifier group?")) {
                          return;
                        }
                        startTransition(async () => {
                          setError(null);
                          try {
                            await deleteModifierGroupAction(
                              restaurantId,
                              modifierGroupDraft.item_id,
                              modifierGroupDraft.previous_group_name!
                            );
                            const removeKey = groupKey(
                              modifierGroupDraft.item_id,
                              modifierGroupDraft.previous_group_name!
                            );
                            setModifiers((prev) =>
                              prev.filter(
                                (m) =>
                                  groupKey(m.item_id, m.group_name) !== removeKey
                              )
                            );
                            resetEdits();
                            afterMenuMutation("Modifier group deleted.");
                          } catch (e) {
                            setError(
                              e instanceof Error ? e.message : "Delete failed"
                            );
                          }
                        });
                      }
                    : undefined
                }
                onSave={() => {
                  const parsed =
                    ModifierGroupInputSchema.safeParse(modifierGroupDraft);
                  if (!parsed.success) {
                    setFieldErrors(formatZodFieldErrors(parsed.error));
                    setError(
                      parsed.error.issues[0]?.message ?? "Invalid modifier group"
                    );
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
                      const res = await saveModifierGroupAction(
                        restaurantId,
                        parsed.data
                      );
                      setModifiers((prev) => {
                        const removeKey = groupKey(
                          parsed.data.item_id,
                          parsed.data.previous_group_name ?? parsed.data.group_name
                        );
                        const without = prev.filter(
                          (m) =>
                            groupKey(m.item_id, m.group_name) !== removeKey
                        );
                        return [...without, ...res.modifiers];
                      });
                      setSelectedItemId(parsed.data.item_id);
                      resetEdits();
                      afterMenuMutation("Modifier group saved.");
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "Save failed");
                    }
                  });
                }}
              />
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}

function PanelHeader({
  title,
  count,
  actionLabel,
  onAction,
  actionDisabled,
}: {
  title: string;
  count: number;
  actionLabel: string;
  onAction: () => void;
  actionDisabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
      <div>
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        <p className="text-[11px] text-muted">{count} total</p>
      </div>
      <button
        type="button"
        className="btn-ghost min-h-10 px-3 text-xs"
        disabled={actionDisabled}
        onClick={onAction}
      >
        {actionLabel}
      </button>
    </div>
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
      className="space-y-3 border-t border-line p-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }}
    >
      <label className="block text-xs font-medium text-muted">
        Name
        <input
          className="input-base mt-1"
          value={draft.name}
          required
          disabled={pending}
          onChange={(e) => onChange({ ...draft, name: e.target.value })}
        />
        <FieldHint
          error={fieldErrors.name ?? duplicateHint ?? undefined}
        />
      </label>
      <label className="block text-xs font-medium text-muted">
        Sort order
        <input
          type="number"
          className="input-base mt-1"
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
        <FieldHint error={fieldErrors.sort_order} />
      </label>
      <FormActions
        pending={pending}
        isNew={isNew}
        onCancel={onCancel}
        onDelete={onDelete}
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
      <label className="block text-xs font-medium text-muted">
        Category
        <select
          className="input-base mt-1"
          value={draft.category_id}
          disabled={pending}
          onChange={(e) =>
            onChange({ ...draft, category_id: e.target.value })
          }
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <FieldHint error={fieldErrors.category_id} />
      </label>
      <label className="block text-xs font-medium text-muted">
        Name
        <input
          className="input-base mt-1"
          value={draft.name}
          required
          disabled={pending}
          onChange={(e) => onChange({ ...draft, name: e.target.value })}
        />
        <FieldHint error={fieldErrors.name ?? duplicateHint ?? undefined} />
      </label>
      <label className="block text-xs font-medium text-muted">
        Description
        <textarea
          className="input-base mt-1 min-h-[72px] resize-y"
          value={draft.description ?? ""}
          disabled={pending}
          onChange={(e) =>
            onChange({
              ...draft,
              description: e.target.value || null,
            })
          }
        />
        <FieldHint error={fieldErrors.description} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-medium text-muted">
          Price (USD)
          <input
            type="number"
            step="0.01"
            min={0}
            className="input-base mt-1"
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
          <FieldHint error={fieldErrors.price} />
        </label>
        <label className="block text-xs font-medium text-muted">
          Sort order
          <input
            type="number"
            min={0}
            className="input-base mt-1"
            value={draft.sort_order ?? 1}
            disabled={pending}
            onChange={(e) =>
              onChange({
                ...draft,
                sort_order: parseSortOrderInput(
                  e.target.value,
                  draft.sort_order ?? 1
                ),
              })
            }
          />
          <FieldHint error={fieldErrors.sort_order} />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          checked={draft.is_available}
          disabled={pending}
          onChange={(e) =>
            onChange({ ...draft, is_available: e.target.checked })
          }
        />
        Available for ordering
      </label>
      <FormActions
        pending={pending}
        isNew={isNew}
        onCancel={onCancel}
        onDelete={onDelete}
      />
    </form>
  );
}

function FieldHint({
  error,
  warning,
}: {
  error?: string;
  warning?: string | null;
}) {
  if (error) {
    return <p className="mt-1 text-[11px] text-danger">{error}</p>;
  }
  if (warning) {
    return <p className="mt-1 text-[11px] text-warning">{warning}</p>;
  }
  return null;
}

function FormActions({
  pending,
  isNew,
  onCancel,
  onDelete,
}: {
  pending: boolean;
  isNew: boolean;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
      <button type="submit" className="btn-primary text-sm" disabled={pending}>
        {pending ? "Saving…" : isNew ? "Create" : "Save"}
      </button>
      <button
        type="button"
        className="btn-ghost text-sm"
        disabled={pending}
        onClick={onCancel}
      >
        Cancel
      </button>
      {onDelete ? (
        <button
          type="button"
          className="btn-ghost ml-auto text-sm text-danger"
          disabled={pending}
          onClick={onDelete}
        >
          Delete
        </button>
      ) : null}
    </div>
  );
}
