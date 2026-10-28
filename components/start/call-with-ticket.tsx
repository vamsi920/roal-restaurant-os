"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { TrialCall } from "@/components/try/trial-call";
import { trialApi } from "@/components/try/trial-api";
import { cn } from "@/lib/cn";
import type { LiveTicket } from "@/lib/trial/live-ticket";
import type { TrialTranscriptTurn } from "@/lib/trial/types";
import "@/components/try/trial.css";

const money = (n: number) => `$${n.toFixed(2)}`;

/**
 * Demo call with the kitchen ticket building beside it: every time the host replies, the
 * transcript so far is re-read into a ticket (items, options, notes, subtotal from the menu).
 */
export function CallWithTicket({
  trialId,
  agentName,
  restaurantName,
}: {
  trialId: string;
  agentName: string;
  restaurantName: string;
}) {
  const [ticket, setTicket] = useState<LiveTicket | null>(null);
  const [updating, setUpdating] = useState(false);
  const seq = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSent = useRef(0);

  const refresh = useCallback(
    (turns: TrialTranscriptTurn[]) => {
      // Re-read after the host speaks (it confirms or repeats items), at most once per turn.
      const last = turns[turns.length - 1];
      if (!last || last.role !== "agent" || turns.length === lastSent.current) return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(async () => {
        lastSent.current = turns.length;
        const mine = ++seq.current;
        setUpdating(true);
        const res = await trialApi.ticket(trialId, turns.map(({ role, text }) => ({ role, text })));
        if (mine !== seq.current) return;
        setUpdating(false);
        if (res.ok && res.data.ticket) setTicket(res.data.ticket);
      }, 400);
    },
    [trialId]
  );

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return (
    <div className="sf__callgrid">
      <div className="sf__callgrid-call">
        <TrialCall
          trialId={trialId}
          agentName={agentName}
          restaurantName={restaurantName}
          compact
          onTranscript={refresh}
          onCallEnded={refresh}
        />
      </div>
      <aside className="sf__ticket" aria-label="Live order ticket" aria-live="polite">
        <header className="sf__ticket-head">
          <div className="min-w-0">
            <p className="sf__ticket-kicker">Kitchen ticket</p>
            <p className="sf__ticket-title">{restaurantName}</p>
          </div>
          <span className={cn("sf__ticket-badge", ticket?.confirmed ? "is-ok" : "is-live")}>
            {ticket?.confirmed ? "Confirmed" : updating ? "Updating…" : "Live"}
          </span>
        </header>
        {ticket?.customerName ? <p className="sf__ticket-for">For {ticket.customerName} · Pickup</p> : null}

        {ticket && ticket.lines.length ? (
          <ul className="sf__ticket-lines">
            <AnimatePresence initial={false}>
              {ticket.lines.map((line) => (
                <motion.li
                  key={`${line.name}-${line.mods.map((m) => m.name).join(",")}`}
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
                      <span key={m.name} className="sf__ticket-mod">
                        + {m.name}
                        {m.price ? ` (${money(m.price)})` : ""}
                      </span>
                    ))}
                    {line.note ? <span className="sf__ticket-mod sf__ticket-note">“{line.note}”</span> : null}
                  </span>
                  <span className="sf__ticket-price">{line.lineTotal != null ? money(line.lineTotal) : "—"}</span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        ) : (
          <p className="sf__ticket-empty">
            Start the call and order something. Your ticket fills in here as you talk, just like it would print in
            your kitchen.
          </p>
        )}

        <footer className="sf__ticket-foot">
          <span>Subtotal</span>
          <motion.strong key={ticket?.subtotal ?? 0} initial={{ scale: 1.15 }} animate={{ scale: 1 }}>
            {money(ticket?.subtotal ?? 0)}
          </motion.strong>
        </footer>
        <p className="sf__ticket-fine">Prices from your menu, before tax.</p>
      </aside>
    </div>
  );
}
