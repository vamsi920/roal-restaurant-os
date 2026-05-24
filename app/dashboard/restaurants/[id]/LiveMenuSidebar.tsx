"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { aggregateModifierGroups } from "@/lib/menu-editor/modifier-groups";
import { loadRestaurantMenu } from "@/lib/menu-editor/load-menu";
import {
  filterItemsToCategories,
  filterModifiersToItems,
} from "@/lib/menu-editor/live-menu-scope";
import type { DbCategory, DbItem, DbModifier } from "@/lib/types";
import { cn } from "@/lib/cn";

type Props = {
  restaurantId: string;
  initialCategories: DbCategory[];
  initialItems: DbItem[];
  initialModifiers: DbModifier[];
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

export function LiveMenuSidebar({
  restaurantId,
  initialCategories,
  initialItems,
  initialModifiers,
}: Props) {
  const [categories, setCategories] = useState<DbCategory[]>(initialCategories);
  const [items, setItems] = useState<DbItem[]>(initialItems);
  const [modifiers, setModifiers] = useState<DbModifier[]>(initialModifiers);
  const [flashedIds, setFlashedIds] = useState<Set<string>>(new Set());
  const [realtimeDegraded, setRealtimeDegraded] = useState(false);
  const flashTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
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

  function flash(id: string) {
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
  }

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
          setRealtimeDegraded(false);
          stopPoll();
          startPoll(30_000);
          return;
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setRealtimeDegraded(true);
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
      supabase.removeChannel(channel);
    };
  }, [restaurantId]);

  const scopedItems = useMemo(
    () => filterItemsToCategories(items, categories),
    [items, categories]
  );
  const scopedModifiers = useMemo(
    () => filterModifiersToItems(modifiers, scopedItems),
    [modifiers, scopedItems]
  );

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

  const totalItems = scopedItems.length;

  return (
    <aside className="kds-live-menu glass-card kds-panel">
      <div className="kds-panel__header">
        <div className="min-w-0">
          <h2 className="kds-panel__title">Live menu</h2>
          <p className="kds-panel__lead">
            {grouped.categories.length} categories · {totalItems} items
            {realtimeDegraded ? (
              <span className="text-warning"> · syncing periodically</span>
            ) : null}
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-md border border-line bg-elev px-2 py-1">
          <span
            className={cn(
              realtimeDegraded
                ? "inline-block h-2 w-2 shrink-0 rounded-full bg-warning"
                : "pulse-dot"
            )}
          />
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted">
            {realtimeDegraded ? "Sync" : "Live"}
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-3">
        {grouped.categories.length === 0 ? (
          <EmptyMenu />
        ) : (
          <div className="space-y-1">
            <AnimatePresence initial={false}>
              {grouped.categories.map((cat) => {
                const catItems = grouped.itemsByCat.get(cat.id) ?? [];
                return (
                  <motion.div
                    key={cat.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.22 }}
                    className="px-1 pb-2"
                  >
                    <div
                      className={cn(
                        "flex items-center justify-between rounded-md px-3 py-2 transition-colors",
                        flashedIds.has(cat.id) && "flash-row"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono-tabular text-subtle">
                          {String(cat.sort_order).padStart(2, "0")}
                        </span>
                        <h3 className="text-[13px] font-semibold uppercase tracking-wider text-ink">
                          {cat.name}
                        </h3>
                      </div>
                      <span className="text-[11px] font-mono-tabular text-subtle">
                        {catItems.length}
                      </span>
                    </div>

                    <ul className="mt-1 space-y-0.5">
                      <AnimatePresence initial={false}>
                        {catItems.map((item) => {
                          const modRows = grouped.modifiersByItem.get(item.id) ?? [];
                          const modGroups = aggregateModifierGroups(modRows);
                          return (
                            <motion.li
                              key={item.id}
                              layout
                              initial={{ opacity: 0, x: -4 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className={cn(
                                "group relative rounded-md px-3 py-2 hover:bg-accent-soft/40",
                                flashedIds.has(item.id) && "flash-row"
                              )}
                            >
                              <div className="flex items-baseline justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={cn(
                                        "block h-1.5 w-1.5 rounded-full",
                                        item.is_available ? "bg-success" : "bg-subtle"
                                      )}
                                    />
                                    <span
                                      className={cn(
                                        "truncate text-[13px]",
                                        item.is_available ? "text-ink" : "text-subtle"
                                      )}
                                    >
                                      {item.name}
                                    </span>
                                  </div>
                                  {item.description && (
                                    <p className="mt-0.5 line-clamp-1 pl-3.5 text-[11px] text-subtle">
                                      {item.description}
                                    </p>
                                  )}
                                  {modGroups.length > 0 && (
                                    <p className="mt-1 pl-3.5 text-[10px] font-medium uppercase tracking-wider text-subtle">
                                      {modGroups.length} group
                                      {modGroups.length === 1 ? "" : "s"}
                                      {modGroups.length === 1
                                        ? ` · ${modGroups[0].group_name}`
                                        : ""}
                                    </p>
                                  )}
                                </div>
                                <span className="font-mono-tabular text-[13px] text-muted">
                                  {formatPrice(item.price)}
                                </span>
                              </div>
                            </motion.li>
                          );
                        })}
                      </AnimatePresence>
                    </ul>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </aside>
  );
}

function EmptyMenu() {
  return (
    <div className="flex h-full min-h-[280px] flex-col items-center justify-center px-6 text-center">
      <div className="grid h-10 w-10 place-items-center rounded-lg border border-line bg-card shadow-sm">
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-subtle" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6h16M4 12h10M4 18h16" />
        </svg>
      </div>
      <p className="mt-3 text-sm font-medium">Menu is empty</p>
      <p className="mt-1 text-xs text-muted">
        Upload a menu image to populate this view in real time.
      </p>
    </div>
  );
}

function formatPrice(value: number | null): string {
  if (value == null) return "—";
  return `$${value.toFixed(2)}`;
}
