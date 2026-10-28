"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, PenLine } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import "@/components/start/start.css";

export type LiveBillLine = {
  /** Stable per item so re-renders animate changes instead of re-adding the row. */
  key: string;
  name: string;
  qty: number;
  lineTotal: number | null;
  mods: string[];
  note?: string | null;
};

export type LiveBillState = "idle" | "live" | "writing" | "placed";

const money = (n: number) => `$${n.toFixed(2)}`;

/** Tweens a number toward its target so totals tick up like a register. */
function useTicker(target: number, ms = 650): number {
  const [shown, setShown] = useState(target);
  const from = useRef(target);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) {
      setShown(target);
      return;
    }
    const start = performance.now();
    const begin = from.current;
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = begin + (target - begin) * eased;
      setShown(v);
      from.current = v;
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms, reduce]);
  return shown;
}

/** mm:ss since the call (or first item) started; null hides it. */
function useElapsed(since: number | null): string | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (since == null) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [since]);
  if (since == null) return null;
  const s = Math.max(0, Math.floor((now - since) / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * The kitchen ticket printing itself while a guest orders: live dot and timer, a pen while the host
 * writes, items sliding in, quantities popping, the total ticking up, and a stamp when it's sent.
 */
export function LiveBill({
  restaurantName,
  hostName,
  lines,
  subtotal,
  customerName,
  fulfillment = "pickup",
  state,
  startedAt = null,
  ticketNo,
  emptyText,
}: {
  restaurantName: string;
  hostName?: string;
  lines: LiveBillLine[];
  subtotal: number;
  customerName?: string | null;
  fulfillment?: "pickup" | "delivery" | null;
  state: LiveBillState;
  startedAt?: number | null;
  ticketNo?: string;
  emptyText: string;
}) {
  const total = useTicker(subtotal);
  const elapsed = useElapsed(state === "idle" || state === "placed" ? null : startedAt);
  const reduce = useReducedMotion();

  // "+$11.99" chips float up from the total whenever it grows.
  const [bumps, setBumps] = useState<{ id: number; amount: number }[]>([]);
  const lastTotal = useRef(subtotal);
  useEffect(() => {
    const diff = subtotal - lastTotal.current;
    lastTotal.current = subtotal;
    if (diff > 0.004) {
      const id = Date.now() + Math.random();
      setBumps((b) => [...b, { id, amount: diff }]);
      setTimeout(() => setBumps((b) => b.filter((x) => x.id !== id)), 1400);
    }
  }, [subtotal]);

  const itemCount = lines.reduce((n, l) => n + l.qty, 0);
  const live = state === "live" || state === "writing";

  return (
    <motion.aside
      className={cn("sf__ticket lb", state === "placed" && "lb--placed")}
      aria-label="Live order ticket"
      aria-live="polite"
      animate={state === "placed" && !reduce ? { rotate: [0, -1.2, 0.8, 0], scale: [1, 1.02, 1] } : undefined}
      transition={{ duration: 0.6 }}
    >
      <header className="sf__ticket-head">
        <div className="min-w-0">
          <p className="sf__ticket-kicker">
            Kitchen ticket{ticketNo ? <span className="lb__no"> #{ticketNo}</span> : null}
          </p>
          <p className="sf__ticket-title">{restaurantName}</p>
        </div>
        <div className="lb__status">
          {state === "placed" ? (
            <span className="sf__ticket-badge is-ok">Placed</span>
          ) : (
            <span className={cn("lb__live", live && "is-on")}>
              <span className="lb__dot" aria-hidden />
              {live ? "LIVE" : "Ready"}
            </span>
          )}
          {elapsed ? <span className="lb__clock">{elapsed}</span> : null}
        </div>
      </header>

      <AnimatePresence initial={false}>
        {customerName ? (
          <motion.p
            key="for"
            className="sf__ticket-for"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
          >
            For {customerName} · {fulfillment === "delivery" ? "Delivery" : "Pickup"}
          </motion.p>
        ) : null}
      </AnimatePresence>

      {lines.length ? (
        <ul className="sf__ticket-lines">
          <AnimatePresence initial={false}>
            {lines.map((line) => (
              <motion.li
                key={line.key}
                layout
                initial={{ opacity: 0, x: 28, scale: 0.96, backgroundColor: "rgba(234,88,12,0.22)" }}
                animate={{ opacity: 1, x: 0, scale: 1, backgroundColor: "rgba(234,88,12,0)" }}
                exit={{ opacity: 0, x: -28, height: 0, paddingTop: 0, paddingBottom: 0 }}
                transition={{ type: "spring", stiffness: 380, damping: 28, backgroundColor: { duration: 1.2 } }}
              >
                <motion.span
                  key={`${line.key}-q${line.qty}`}
                  className="sf__ticket-qty"
                  initial={{ scale: 1.7 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 18 }}
                >
                  {line.qty}×
                </motion.span>
                <span className="sf__ticket-item">
                  {line.name}
                  {line.mods.map((m) => (
                    <motion.span
                      key={m}
                      className="sf__ticket-mod"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      + {m}
                    </motion.span>
                  ))}
                  {line.note ? <span className="sf__ticket-mod sf__ticket-note">“{line.note}”</span> : null}
                </span>
                <span className="sf__ticket-price">{line.lineTotal != null ? money(line.lineTotal) : "—"}</span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      ) : (
        <p className="sf__ticket-empty">{emptyText}</p>
      )}

      <AnimatePresence>
        {state === "writing" ? (
          <motion.div
            key="writing"
            className="lb__writing"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <PenLine size={14} className="lb__pen" aria-hidden />
            <span>{hostName ? `${hostName} is writing it down` : "Writing it down"}</span>
            <span className="lb__dots" aria-hidden>
              <i />
              <i />
              <i />
            </span>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <footer className="sf__ticket-foot lb__foot">
        <span>
          Subtotal
          {itemCount ? <span className="lb__count"> · {itemCount} item{itemCount === 1 ? "" : "s"}</span> : null}
        </span>
        <span className="lb__total">
          <AnimatePresence>
            {bumps.map((b) => (
              <motion.span
                key={b.id}
                className="lb__bump"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: -26 }}
                exit={{ opacity: 0, y: -40 }}
                transition={{ duration: 0.9 }}
              >
                +{money(b.amount)}
              </motion.span>
            ))}
          </AnimatePresence>
          <motion.strong
            key={Math.round(subtotal * 100)}
            initial={{ scale: 1.18 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 420, damping: 16 }}
          >
            {money(total)}
          </motion.strong>
        </span>
      </footer>
      <p className="sf__ticket-fine">Prices from your menu, before tax.</p>

      <AnimatePresence>
        {state === "placed" ? (
          <motion.div
            key="stamp"
            className="lb__stamp"
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 2.4, rotate: -24 }}
            animate={{ opacity: 1, scale: 1, rotate: -12 }}
            transition={{ type: "spring", stiffness: 260, damping: 14 }}
            aria-hidden
          >
            <Check size={16} strokeWidth={3} /> Sent to kitchen
          </motion.div>
        ) : null}
      </AnimatePresence>
      <div className="lb__tear" aria-hidden />
    </motion.aside>
  );
}
