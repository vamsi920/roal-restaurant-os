"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/cn";
import type { DraftOrderRow } from "@/lib/types";
import "@/components/start/start.css";

type Line = { name: string; qty: number; unitPrice: number | null; mods: string[] };

/** How recent an order must be to show as "this call" (covers a test call plus a minute or two). */
const RECENT_MS = 15 * 60 * 1000;
const POLL_MS = 2500;

function money(n: number): string {
  return `$${n.toFixed(2)}`;
}

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

/**
 * The bill building itself while a guest orders, from the same order the kitchen sees. Works for
 * browser test calls and real calls to the restaurant's line alike.
 */
export function LiveOrderTicket({ restaurantId, restaurantName }: { restaurantId: string; restaurantName: string }) {
  const [order, setOrder] = useState<DraftOrderRow | null>(null);

  useEffect(() => {
    let alive = true;
    async function poll() {
      try {
        const res = await fetch(`/api/restaurants/${restaurantId}/live/orders`, { cache: "no-store" });
        if (!res.ok) return;
        const body = (await res.json()) as { draftOrders?: DraftOrderRow[] };
        if (alive) setOrder(pickCurrentOrder(body.draftOrders ?? []));
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

  return (
    <aside className="sf__ticket" aria-label="Live order ticket" aria-live="polite">
      <header className="sf__ticket-head">
        <div className="min-w-0">
          <p className="sf__ticket-kicker">Kitchen ticket</p>
          <p className="sf__ticket-title">{restaurantName}</p>
        </div>
        <span className={cn("sf__ticket-badge", placed ? "is-ok" : "is-live")}>
          {placed ? "Sent to kitchen" : order ? "Taking order" : "Live"}
        </span>
      </header>
      {order?.customer_name ? (
        <p className="sf__ticket-for">
          For {order.customer_name} · {order.fulfillment_type === "delivery" ? "Delivery" : "Pickup"}
        </p>
      ) : null}

      {lines.length ? (
        <ul className="sf__ticket-lines">
          <AnimatePresence initial={false}>
            {lines.map((line, i) => (
              <motion.li
                key={`${line.name}-${i}`}
                layout
                initial={{ opacity: 0, x: 16, backgroundColor: "rgba(234,88,12,0.12)" }}
                animate={{ opacity: 1, x: 0, backgroundColor: "rgba(234,88,12,0)" }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.45 }}
              >
                <span className="sf__ticket-qty">{line.qty}×</span>
                <span className="sf__ticket-item">
                  {line.name}
                  {line.mods.map((m) => (
                    <span key={m} className="sf__ticket-mod">
                      + {m}
                    </span>
                  ))}
                </span>
                <span className="sf__ticket-price">
                  {line.unitPrice != null ? money(line.unitPrice * line.qty) : "—"}
                </span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      ) : (
        <p className="sf__ticket-empty">
          Call your host and order something. The ticket fills in here as you talk, and the kitchen gets it the moment
          you confirm.
        </p>
      )}

      <footer className="sf__ticket-foot">
        <span>Subtotal</span>
        <strong>{money(subtotal)}</strong>
      </footer>
      <p className="sf__ticket-fine">Prices from your menu, before tax.</p>
    </aside>
  );
}
