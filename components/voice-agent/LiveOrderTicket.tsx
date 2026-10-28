"use client";

import { useEffect, useState } from "react";
import type { DraftOrderRow } from "@/lib/types";
import { LiveBill, type LiveBillState } from "@/components/start/live-bill";

type Line = { name: string; qty: number; unitPrice: number | null; mods: string[] };

/** How recent an order must be to show as "this call" (covers a test call plus a minute or two). */
const RECENT_MS = 15 * 60 * 1000;
const POLL_MS = 1000;

export function linesFromDraft(order: Pick<DraftOrderRow, "items">): Line[] {
  const raw = Array.isArray(order.items) ? order.items : [];
  return raw.map((row) => {
    const r = (row ?? {}) as Record<string, unknown>;
    const mods = Array.isArray(r.customizations)
      ? (r.customizations as unknown[])
          .map((c) => (typeof c === "string" ? c : String((c as Record<string, unknown>)?.name ?? "")))
          .filter(Boolean)
      : [];
    return {
      name: String(r.name ?? "Item"),
      qty: Number(r.quantity ?? 1) || 1,
      unitPrice: typeof r.unit_price === "number" ? r.unit_price : null,
      mods,
    };
  });
}

/** The newest order the host touched in the last few minutes, if any. */
export function pickCurrentOrder(drafts: readonly DraftOrderRow[], now = Date.now()): DraftOrderRow | null {
  const recent = drafts
    .filter((d) => now - new Date(d.updated_at).getTime() < RECENT_MS && d.status !== "canceled")
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  return recent[0] ?? null;
}

/** Shown as "writing" for a few seconds after the host changes the order. */
const WRITING_MS = 5000;

/**
 * The bill building itself while a guest orders, from the same order the kitchen sees. Works for
 * browser test calls and real calls to the restaurant's line alike.
 */
export function LiveOrderTicket({
  restaurantId,
  restaurantName,
  hostName,
}: {
  restaurantId: string;
  restaurantName: string;
  hostName?: string;
}) {
  const [order, setOrder] = useState<DraftOrderRow | null>(null);
  const [callLive, setCallLive] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let alive = true;
    async function poll() {
      try {
        const res = await fetch(`/api/restaurants/${restaurantId}/live/orders`, { cache: "no-store" });
        if (!res.ok) return;
        const body = (await res.json()) as { draftOrders?: DraftOrderRow[]; activeCalls?: unknown[] };
        if (!alive) return;
        setOrder(pickCurrentOrder(body.draftOrders ?? []));
        setCallLive((body.activeCalls ?? []).length > 0);
        setNow(Date.now());
      } catch {
        // Next poll retries.
      }
    }
    void poll();
    const t = setInterval(() => {
      if (document.visibilityState === "visible") void poll();
    }, POLL_MS);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [restaurantId]);

  const lines = order ? linesFromDraft(order) : [];
  const subtotal = lines.reduce((sum, l) => sum + (l.unitPrice ?? 0) * l.qty, 0);
  const placed = Boolean(order && order.status !== "draft");
  const justChanged = order ? now - new Date(order.updated_at).getTime() < WRITING_MS : false;
  const state: LiveBillState = placed
    ? "placed"
    : order && justChanged
      ? "writing"
      : order || callLive
        ? "live"
        : "idle";

  return (
    <LiveBill
      restaurantName={restaurantName}
      hostName={hostName}
      ticketNo={order ? order.id.replace(/[^0-9]/g, "").slice(-4).padStart(4, "0") : undefined}
      lines={lines.map((l, i) => ({
        key: `${l.name}-${l.mods.join(",")}-${i}`,
        name: l.name,
        qty: l.qty,
        lineTotal: l.unitPrice != null ? l.unitPrice * l.qty : null,
        mods: l.mods,
      }))}
      subtotal={subtotal}
      customerName={order?.customer_name}
      fulfillment={order?.fulfillment_type}
      state={state}
      startedAt={order ? new Date(order.created_at).getTime() : null}
      emptyText="Call your host and order something. The ticket fills in here as you talk, and the kitchen gets it the moment you confirm."
    />
  );
}
