"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { UtensilsCrossed } from "lucide-react";
import { fetchLiveJson, usePoll } from "@/lib/live/use-poll";
import { liveEndpoints } from "@/lib/live/endpoints";
import { aggregateModifierGroups } from "@/lib/menu-editor/modifier-groups";
import type { RestaurantMenuSnapshot } from "@/lib/menu-editor/load-menu";
import {
  filterItemsToCategories,
  filterModifiersToItems,
} from "@/lib/menu-editor/live-menu-scope";
import type { DbCategory, DbItem, DbModifier } from "@/lib/types";
import { cn } from "@/lib/cn";
import { Badge, EmptyState } from "@/components/ui";
import {
  Notice,
  RealtimeBadge,
  type RealtimeState,
} from "@/components/live-orders/workspace-ui";
import { formatMenuPrice } from "./menu/menu-ui";

type Props = {
  restaurantId: string;
  initialCategories: DbCategory[];
  initialItems: DbItem[];
  initialModifiers: DbModifier[];
  /** Parent section supplies the visible title (menu setup page). */
  hidePanelHeader?: boolean;
};

/** Stable fingerprint of server-passed menu rows (not reference identity). */
function serverMenuKey(
  restaurantId: string,
  cats: DbCategory[],
  its: DbItem[],
  mods: DbModifier[]
): string {
  const c = [...cats].map((x) => x.id).sort().join(",");
  const i = [...its].map((x) => x.id).sort().join(",");
  const m = [...mods].map((x) => x.id).sort().join(",");
  return `${restaurantId}|${c}|${i}|${m}`;
}

type LiveMenuPayload = RestaurantMenuSnapshot & { serverTime?: string };

export type LiveMenuState = {
  categories: DbCategory[];
  items: DbItem[];
  modifiers: DbModifier[];
  setCategories: Dispatch<SetStateAction<DbCategory[]>>;
  setItems: Dispatch<SetStateAction<DbItem[]>>;
  setModifiers: Dispatch<SetStateAction<DbModifier[]>>;
  /** Items/categories scoped to this restaurant's categories. */
  scopedItems: DbItem[];
  scopedModifiers: DbModifier[];
  flashedIds: Set<string>;
  menuRealtime: RealtimeState;
  menuUpdatedVisible: boolean;
};

/**
 * Live menu rows for one restaurant: seeded from the server snapshot, kept current
 * by polling GET /api/restaurants/[id]/live/menu (3s visible / 15s hidden), with
 * an immediate resync on `roal:menu-changed`. Unchanged polls never overwrite
 * local (optimistic) editor state.
 */
export function useLiveMenu(
  restaurantId: string,
  initialCategories: DbCategory[],
  initialItems: DbItem[],
  initialModifiers: DbModifier[]
): LiveMenuState {
  const [categories, setCategories] = useState<DbCategory[]>(initialCategories);
  const [items, setItems] = useState<DbItem[]>(initialItems);
  const [modifiers, setModifiers] = useState<DbModifier[]>(initialModifiers);
  const [flashedIds, setFlashedIds] = useState<Set<string>>(new Set());
  const [menuUpdatedVisible, setMenuUpdatedVisible] = useState(false);
  const flashTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const menuUpdatedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scopeRef = useRef({
    categoryIds: new Set(initialCategories.map((c) => c.id)),
    itemIds: new Set(initialItems.map((i) => i.id)),
  });

  const serverKey = useMemo(
    () =>
      serverMenuKey(
        restaurantId,
        initialCategories,
        initialItems,
        initialModifiers
      ),
    [restaurantId, initialCategories, initialItems, initialModifiers]
  );

  useLayoutEffect(() => {
    setCategories(initialCategories);
    setItems(initialItems);
    setModifiers(initialModifiers);
    setFlashedIds(new Set());
    flashTimers.current.forEach((t) => clearTimeout(t));
    flashTimers.current.clear();
    // Intentionally keyed only on server snapshot — avoids clobbering realtime
    // updates when parent re-renders with the same menu rows.
    scopeRef.current = {
      categoryIds: new Set(initialCategories.map((c) => c.id)),
      itemIds: new Set(initialItems.map((i) => i.id)),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverKey]);

  useLayoutEffect(() => {
    scopeRef.current.categoryIds = new Set(categories.map((c) => c.id));
    scopeRef.current.itemIds = new Set(items.map((i) => i.id));
  }, [categories, items]);

  const showMenuUpdated = useCallback(() => {
    setMenuUpdatedVisible(true);
    if (menuUpdatedTimer.current) clearTimeout(menuUpdatedTimer.current);
    menuUpdatedTimer.current = setTimeout(() => {
      setMenuUpdatedVisible(false);
      menuUpdatedTimer.current = null;
    }, 4000);
  }, []);

  const flash = useCallback(
    (id: string) => {
      showMenuUpdated();
      setFlashedIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      const existing = flashTimers.current.get(id);
      if (existing) clearTimeout(existing);
      const t = setTimeout(() => {
        setFlashedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        flashTimers.current.delete(id);
      }, 1800);
      flashTimers.current.set(id, t);
    },
    [showMenuUpdated]
  );

  useEffect(() => {
    let cancelled = false;
    let resyncTimer: ReturnType<typeof setTimeout> | null = null;

    function scheduleResync() {
      if (resyncTimer) clearTimeout(resyncTimer);
      resyncTimer = setTimeout(() => {
        resyncTimer = null;
        if (!cancelled) void refreshMenuRef.current();
      }, 400);
    }

    function onMenuCleared(e: Event) {
      const ce = e as CustomEvent<{ restaurantId?: string }>;
      if (ce.detail?.restaurantId !== restaurantId) return;
      setCategories([]);
      setItems([]);
      setModifiers([]);
      setFlashedIds(new Set());
      flashTimers.current.forEach((t) => clearTimeout(t));
      flashTimers.current.clear();
      scopeRef.current = { categoryIds: new Set(), itemIds: new Set() };
    }

    function onMenuChanged(e: Event) {
      const ce = e as CustomEvent<{ restaurantId?: string }>;
      if (ce.detail?.restaurantId !== restaurantId) return;
      scheduleResync();
    }

    window.addEventListener("roal:menu-cleared", onMenuCleared as EventListener);
    window.addEventListener("roal:menu-changed", onMenuChanged as EventListener);

    const timers = flashTimers.current;
    return () => {
      cancelled = true;
      window.removeEventListener("roal:menu-cleared", onMenuCleared as EventListener);
      window.removeEventListener("roal:menu-changed", onMenuChanged as EventListener);
      if (resyncTimer) clearTimeout(resyncTimer);
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
      if (menuUpdatedTimer.current) clearTimeout(menuUpdatedTimer.current);
    };
  }, [restaurantId]);

  /** Fingerprint of the last server snapshot we applied (skip unchanged polls). */
  const lastServerFingerprint = useRef<string | null>(null);
  const lastServerRows = useRef<Map<string, string>>(new Map());

  const applySnapshot = useCallback(
    (snap: LiveMenuPayload) => {
      const cats = snap.categories.filter((c) => c.restaurant_id === restaurantId);
      const catIds = new Set(cats.map((c) => c.id));
      const its = snap.items.filter((i) => catIds.has(i.category_id));
      const itemIds = new Set(its.map((i) => i.id));
      const mods = snap.modifiers.filter((m) => itemIds.has(m.item_id));

      const rowSig = new Map<string, string>();
      for (const c of cats) rowSig.set(c.id, `${c.name}|${c.sort_order}|${c.updated_at ?? ""}`);
      for (const i of its) {
        rowSig.set(i.id, `${i.name}|${i.price}|${i.is_available}|${i.sort_order}|${i.updated_at ?? ""}`);
      }
      const modSig = mods
        .map((m) => `${m.id}:${m.group_name}:${m.modifier_name}:${m.extra_price}:${m.sort_order}:${m.group_sort_order}`)
        .sort()
        .join(",");
      const fingerprint = `${[...rowSig.entries()].map(([k, v]) => `${k}=${v}`).sort().join(",")}#${modSig}`;
      if (fingerprint === lastServerFingerprint.current) return;

      const previous = lastServerRows.current;
      const isFirst = lastServerFingerprint.current === null;
      lastServerFingerprint.current = fingerprint;
      lastServerRows.current = rowSig;

      setCategories(cats);
      setItems(its);
      setModifiers(mods);
      scopeRef.current = { categoryIds: catIds, itemIds };

      if (!isFirst) {
        for (const [id, sig] of rowSig) {
          if (previous.get(id) !== sig) flash(id);
        }
      }
    },
    [restaurantId, flash]
  );

  const poll = usePoll<LiveMenuPayload>(
    (signal) => fetchLiveJson<LiveMenuPayload>(liveEndpoints.menu(restaurantId), signal),
    { onData: applySnapshot }
  );
  const refreshMenuRef = useRef(poll.refresh);
  refreshMenuRef.current = poll.refresh;
  const menuRealtime: RealtimeState = poll.state;

  const scopedItems = useMemo(
    () => filterItemsToCategories(items, categories),
    [items, categories]
  );
  const scopedModifiers = useMemo(
    () => filterModifiersToItems(modifiers, scopedItems),
    [modifiers, scopedItems]
  );

  return {
    categories,
    items,
    modifiers,
    setCategories,
    setItems,
    setModifiers,
    scopedItems,
    scopedModifiers,
    flashedIds,
    menuRealtime,
    menuUpdatedVisible,
  };
}

/**
 * Compact, read-only live menu list (categories → items) backed by useLiveMenu.
 * The Menu page uses MenuEditor (same hook) for the editable board; this list is
 * kept for narrow read-only surfaces.
 */
export function LiveMenuSidebar({
  restaurantId,
  initialCategories,
  initialItems,
  initialModifiers,
  hidePanelHeader = false,
}: Props) {
  const {
    categories,
    scopedItems,
    scopedModifiers,
    flashedIds,
    menuRealtime,
    menuUpdatedVisible,
  } = useLiveMenu(restaurantId, initialCategories, initialItems, initialModifiers);

  const grouped = useMemo(() => {
    const itemsByCat = new Map<string, DbItem[]>();
    for (const it of scopedItems) {
      const arr = itemsByCat.get(it.category_id) ?? [];
      arr.push(it);
      itemsByCat.set(it.category_id, arr);
    }
    for (const arr of itemsByCat.values()) {
      arr.sort(
        (a, b) =>
          (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
          a.name.localeCompare(b.name)
      );
    }
    const modifiersByItem = new Map<string, DbModifier[]>();
    for (const m of scopedModifiers) {
      const arr = modifiersByItem.get(m.item_id) ?? [];
      arr.push(m);
      modifiersByItem.set(m.item_id, arr);
    }
    const sorted = [...categories].sort((a, b) => a.sort_order - b.sort_order);
    return { categories: sorted, itemsByCat, modifiersByItem };
  }, [categories, scopedItems, scopedModifiers]);

  return (
    <aside className="panel min-w-0 max-w-full overflow-hidden" aria-label="Live menu">
      <div className="panel__head">
        {!hidePanelHeader ? (
          <div className="min-w-0">
            <h2 className="panel__title">Live menu</h2>
            <p className="text-[12.5px] text-subtle">
              {grouped.categories.length} categories · {scopedItems.length} items
            </p>
          </div>
        ) : (
          <span className="text-[12.5px] text-subtle">
            {grouped.categories.length} categories · {scopedItems.length} items
          </span>
        )}
        <RealtimeBadge state={menuRealtime} />
      </div>

      {menuUpdatedVisible ? (
        <Notice tone="ok" className="mx-4 mt-3">
          Menu updated — the phone host uses your latest items.
        </Notice>
      ) : null}

      {grouped.categories.length === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          title="Menu is empty"
          body="Scan a menu photo or add a category. Items appear here as you save."
        />
      ) : (
        <div className="max-h-[min(70vh,560px)] overflow-y-auto overscroll-contain py-2">
          {grouped.categories.map((cat) => {
            const catItems = grouped.itemsByCat.get(cat.id) ?? [];
            return (
              <div key={cat.id} className="pb-2">
                <div
                  className={cn(
                    "flex min-w-0 items-center justify-between gap-2 px-[1.125rem] py-1.5",
                    flashedIds.has(cat.id) && "flash-row"
                  )}
                >
                  <h3 className="min-w-0 truncate text-[12.5px] font-semibold text-muted">
                    {cat.name}
                  </h3>
                  <span className="text-[12px] tabular-nums text-subtle">{catItems.length}</span>
                </div>
                <ul>
                  {catItems.map((item) => {
                    const modGroups = aggregateModifierGroups(
                      grouped.modifiersByItem.get(item.id) ?? []
                    );
                    return (
                      <li
                        key={item.id}
                        className={cn("list-row py-2", flashedIds.has(item.id) && "flash-row")}
                      >
                        <div className="min-w-0 flex-1">
                          <p
                            className={cn(
                              "truncate text-[13.5px] font-medium",
                              item.is_available ? "text-ink" : "text-subtle line-through"
                            )}
                          >
                            {item.name}
                          </p>
                          {modGroups.length > 0 ? (
                            <p className="truncate text-[12px] text-subtle">
                              {modGroups.map((g) => g.group_name).join(" · ")}
                            </p>
                          ) : null}
                        </div>
                        {!item.is_available ? <Badge tone="warn">Sold out</Badge> : null}
                        <span className="shrink-0 text-[13px] tabular-nums text-muted">
                          {formatMenuPrice(item.price)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
}
