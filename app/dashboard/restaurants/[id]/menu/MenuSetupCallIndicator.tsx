"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { isSyncDraftOrderStatus, isVoiceCartStatus } from "@/lib/order-status";
import type { DraftOrderRow } from "@/lib/types";
import { cn } from "@/lib/cn";

export function MenuSetupCallIndicator({ restaurantId }: { restaurantId: string }) {
  const [drafts, setDrafts] = useState<DraftOrderRow[]>([]);

  const loadDrafts = useCallback(async () => {
    const supabase = getBrowserSupabase();
    const { data } = await supabase
      .from("draft_orders")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("updated_at", { ascending: false });
    setDrafts((data as DraftOrderRow[]) ?? []);
  }, [restaurantId]);

  useEffect(() => {
    void loadDrafts();
    const supabase = getBrowserSupabase();
    const channel = supabase
      .channel(`menu-setup-calls:${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "draft_orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => {
          void loadDrafts();
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [restaurantId, loadDrafts]);

  const activeCallCount = useMemo(
    () => drafts.filter((o) => isVoiceCartStatus(o.status)).length,
    [drafts]
  );
  const syncingUpdateCount = useMemo(
    () =>
      drafts.filter(
        (o) =>
          typeof o.status === "string" &&
          isSyncDraftOrderStatus(o.status) &&
          !isVoiceCartStatus(o.status)
      ).length,
    [drafts]
  );
  const live = activeCallCount > 0 || syncingUpdateCount > 0;
  const liveLabel =
    activeCallCount > 0
      ? "Call in progress"
      : syncingUpdateCount > 0
        ? "Syncing menu updates"
        : "No active call";
  const liveCount = activeCallCount > 0 ? activeCallCount : syncingUpdateCount;

  if (!live) {
    return (
      <span className="sr-only" role="status" aria-live="polite">
        {liveLabel}
      </span>
    );
  }

  return (
    <span
      className={cn("badge", activeCallCount > 0 ? "badge--live" : "badge--info")}
      role="status"
      aria-live="polite"
      title={
        activeCallCount > 0
          ? "A guest is on the phone with your host right now"
          : "Order updates are syncing from a recent call"
      }
    >
      <span
        className="h-1.5 w-1.5 rounded-full bg-current motion-safe:animate-pulse"
        aria-hidden
      />
      {liveLabel}
      {liveCount > 1 ? <span className="tabular-nums">· {liveCount}</span> : null}
    </span>
  );
}
