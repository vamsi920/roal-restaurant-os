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
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { UtensilsCrossed } from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { aggregateModifierGroups } from "@/lib/menu-editor/modifier-groups";
import { loadRestaurantMenu } from "@/lib/menu-editor/load-menu";
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
 * by Supabase realtime (categories, items, modifiers), with a polling fallback
 * when the channel degrades and a resync on `roal:menu-changed`.
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
  const [menuRealtime, setMenuRealtime] = useState<RealtimeState>("connecting");
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
    window.addEventListener("roal:menu-cleared", onMenuCleared as EventListener);

    function onMenuChanged(e: Event) {
      const ce = e as CustomEvent<{ restaurantId?: string }>;
      if (ce.detail?.restaurantId !== restaurantId) return;
      void syncMenuFromServer();
    }
    window.addEventListener("roal:menu-changed", onMenuChanged as EventListener);

    const supabase = getBrowserSupabase();
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let resyncTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    async function syncMenuFromServer() {
      try {
        const snap = await loadRestaurantMenu(supabase, restaurantId);
        if (cancelled) return;
        setCategories(snap.categories);
        setItems(snap.items);
        setModifiers(snap.modifiers);
        scopeRef.current = {
          categoryIds: new Set(snap.categories.map((c) => c.id)),
          itemIds: new Set(snap.items.map((i) => i.id)),
        };
      } catch {
        /* best-effort fallback */
      }
    }

    function scheduleResync() {
      if (resyncTimer) clearTimeout(resyncTimer);
      resyncTimer = setTimeout(() => {
        resyncTimer = null;
        void syncMenuFromServer();
      }, 400);
    }

    function startPoll(ms: number) {
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = setInterval(() => void syncMenuFromServer(), ms);
    }

    function stopPoll() {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    }

    function onVisible() {
      if (document.visibilityState === "visible") {
        void syncMenuFromServer();
      }
    }
    document.addEventListener("visibilitychange", onVisible);

    const channel = supabase
      .channel(`menu-${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "categories",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload: RealtimePostgresChangesPayload<DbCategory>) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as DbCategory;
            setCategories((prev) =>
              prev.some((c) => c.id === row.id) ? prev : [...prev, row]
            );
            flash(row.id);
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as DbCategory;
            setCategories((prev) => prev.map((c) => (c.id === row.id ? row : c)));
            flash(row.id);
          } else if (payload.eventType === "DELETE") {
            const row = payload.old as DbCategory;
            const catId = row.id;
            setCategories((prev) => prev.filter((c) => c.id !== catId));
            setItems((prevItems) => {
              const dropItemIds = prevItems
                .filter((i) => i.category_id === catId)
                .map((i) => i.id);
              if (dropItemIds.length > 0) {
                setModifiers((prevMods) =>
                  prevMods.filter((m) => !dropItemIds.includes(m.item_id))
                );
              }
              return prevItems.filter((i) => i.category_id !== catId);
            });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "items" },
        (payload: RealtimePostgresChangesPayload<DbItem>) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as DbItem;
            if (!scopeRef.current.categoryIds.has(row.category_id)) {
              scheduleResync();
              return;
            }
            setItems((prev) => {
              if (prev.some((i) => i.id === row.id)) return prev;
              return [...prev, row];
            });
            flash(row.id);
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as DbItem;
            const known =
              scopeRef.current.itemIds.has(row.id) ||
              scopeRef.current.categoryIds.has(row.category_id);
            if (!known) return;
            setItems((prev) => prev.map((i) => (i.id === row.id ? row : i)));
            flash(row.id);
          } else if (payload.eventType === "DELETE") {
            const row = payload.old as DbItem;
            setItems((prev) => prev.filter((i) => i.id !== row.id));
            setModifiers((prev) => prev.filter((m) => m.item_id !== row.id));
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "modifiers" },
        (payload: RealtimePostgresChangesPayload<DbModifier>) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as DbModifier;
            if (!scopeRef.current.itemIds.has(row.item_id)) return;
            setModifiers((prev) =>
              prev.some((m) => m.id === row.id) ? prev : [...prev, row]
            );
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as DbModifier;
            if (!scopeRef.current.itemIds.has(row.item_id)) return;
            setModifiers((prev) => prev.map((m) => (m.id === row.id ? row : m)));
          } else if (payload.eventType === "DELETE") {
            const row = payload.old as DbModifier;
            setModifiers((prev) => prev.filter((m) => m.id !== row.id));
          }
        }
      )
      .subscribe((status) => {
        if (cancelled) return;
        if (status === "SUBSCRIBED") {
          setMenuRealtime("live");
          stopPoll();
          startPoll(30_000);
          return;
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setMenuRealtime("degraded");
          stopPoll();
          void syncMenuFromServer();
          startPoll(8_000);
        }
      });

    const timers = flashTimers.current;
    return () => {
      cancelled = true;
      window.removeEventListener(
        "roal:menu-cleared",
        onMenuCleared as EventListener
      );
      window.removeEventListener(
        "roal:menu-changed",
        onMenuChanged as EventListener
      );
      document.removeEventListener("visibilitychange", onVisible);
      if (resyncTimer) clearTimeout(resyncTimer);
      stopPoll();
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
      if (menuUpdatedTimer.current) clearTimeout(menuUpdatedTimer.current);
      supabase.removeChannel(channel);
    };
  }, [restaurantId, flash]);

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
