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

  return (
    <div
      className={cn(
        "menu-setup-call-indicator",
        live && "menu-setup-call-indicator--live"
      )}
      role="status"
      aria-live="polite"
    >
      <span
        className={cn(
          "menu-setup-call-indicator__dot",
          live && "menu-setup-call-indicator__dot--live"
        )}
        aria-hidden
      />
      <span className="menu-setup-call-indicator__label">
        {liveLabel}
      </span>
      {live ? (
        <span className="menu-setup-call-indicator__count tabular-nums">
          {liveCount}
        </span>
      ) : null}
    </div>
  );
}
