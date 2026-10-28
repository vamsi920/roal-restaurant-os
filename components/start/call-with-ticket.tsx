"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { TrialCall } from "@/components/try/trial-call";
import { trialApi } from "@/components/try/trial-api";
import { cn } from "@/lib/cn";
import { LiveBill, type LiveBillState } from "@/components/start/live-bill";
import type { LiveTicket } from "@/lib/trial/live-ticket";
import type { TrialTranscriptTurn } from "@/lib/trial/types";
import "@/components/try/trial.css";

/**
 * Demo call with the kitchen ticket building beside it: every time the host replies, the
 * transcript so far is re-read into a ticket (items, options, notes, subtotal from the menu).
 */
export function CallWithTicket({
  trialId,
  agentName,
  restaurantName,
  fill = false,
  aside,
}: {
  trialId: string;
  agentName: string;
  restaurantName: string;
  /** Fit the whole grid into the remaining viewport height; the transcript and ticket scroll inside. */
  fill?: boolean;
  /** Rendered under the ticket in the side column. */
  aside?: ReactNode;
}) {
  const [ticket, setTicket] = useState<LiveTicket | null>(null);
  const [updating, setUpdating] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [ended, setEnded] = useState(false);
  const seq = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSent = useRef(0);

  const refresh = useCallback(
    (turns: TrialTranscriptTurn[]) => {
      // Re-read on every finished turn, so an item shows up as soon as the guest says it.
      const last = turns[turns.length - 1];
      if (!last) return;
      setStartedAt((t) => t ?? Date.now());
      if (turns.length === lastSent.current) return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(async () => {
        lastSent.current = turns.length;
        const mine = ++seq.current;
        setUpdating(true);
        const res = await trialApi.ticket(trialId, turns.map(({ role, text }) => ({ role, text })));
        if (mine !== seq.current) return;
        setUpdating(false);
        if (res.ok && res.data.ticket) setTicket(res.data.ticket);
      }, 200);
    },
    [trialId]
  );

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const billState: LiveBillState = ticket?.confirmed
    ? "placed"
    : updating
      ? "writing"
      : startedAt && !ended
        ? "live"
        : "idle";

  return (
    <div className={cn("sf__callgrid", fill && "sf__callgrid--fill")}>
      <div className="sf__callgrid-call">
        <TrialCall
          trialId={trialId}
          agentName={agentName}
          restaurantName={restaurantName}
          compact
          onTranscript={refresh}
          onCallEnded={(turns) => {
            setEnded(true);
            refresh(turns);
          }}
        />
      </div>
      <div className="sf__callgrid-side">
        <LiveBill
          restaurantName={restaurantName}
          hostName={agentName}
          ticketNo={ticketNumber(trialId)}
          lines={(ticket?.lines ?? []).map((line) => ({
            key: `${line.name}-${line.mods.map((m) => m.name).join(",")}`,
            name: line.name,
            qty: line.qty,
            lineTotal: line.lineTotal,
            mods: line.mods.map((m) => (m.price ? `${m.name} (${formatMoney(m.price)})` : m.name)),
            note: line.note,
          }))}
          subtotal={ticket?.subtotal ?? 0}
          customerName={ticket?.customerName}
          state={billState}
          startedAt={startedAt}
          emptyText="Start the call and order something. Your ticket fills in here as you talk, just like it would print in your kitchen."
        />
        {aside}
      </div>
    </div>
  );
}

function formatMoney(n: number): string {
  return `$${n.toFixed(2)}`;
}

/** A short, stable ticket number for the demo ("#4821"). */
function ticketNumber(id: string): string {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return String(1000 + (h % 9000));
}
