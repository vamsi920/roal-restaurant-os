"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PhoneCall } from "lucide-react";
import { IconTile } from "@/components/ui";

type Line = { restaurantId: string; phoneNumber: string | null };
type State = { kind: "working" } | { kind: "done"; lines: Line[] } | { kind: "later" };

/** Shown right after payment: gets each location's phone line and shows the numbers. */
export function PhoneLineSetup() {
  const [state, setState] = useState<State>({ kind: "working" });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/billing/phone-lines", { method: "POST" })
      .then(async (res) => {
        const body = (await res.json().catch(() => ({}))) as { lines?: Line[] };
        if (cancelled) return;
        setState(res.ok && body.lines ? { kind: "done", lines: body.lines } : { kind: "later" });
      })
      .catch(() => !cancelled && setState({ kind: "later" }));
    return () => {
      cancelled = true;
    };
  }, []);

  const ready = state.kind === "done" ? state.lines.filter((l) => l.phoneNumber) : [];
  const waiting = state.kind === "later" || (state.kind === "done" && ready.length < state.lines.length);

  return (
    <div
      className="billing-dashboard__phone-lines panel flex min-w-0 items-start gap-3 border-success/25 bg-success/5 p-4 text-[13px] text-muted"
      role="status"
    >
      <IconTile icon={PhoneCall} color="green" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink">Your plan is active.</p>
        {state.kind === "working" ? (
          <p className="mt-1">Setting up your phone line now. This takes a few seconds…</p>
        ) : null}
        {ready.length > 0 ? (
          <ul className="mt-1 space-y-1">
            {ready.map((l) => (
              <li key={l.restaurantId}>
                Your phone line: <span className="font-semibold tabular-nums text-ink">{l.phoneNumber}</span>{" "}
                <Link className="underline" href={`/dashboard/restaurants/${l.restaurantId}/agent`}>
                  How to forward your calls
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
        {waiting ? (
          <p className="mt-1">
            We&apos;re finishing your phone line. It will show on your Phone host page shortly, no need to do anything.
          </p>
        ) : null}
      </div>
    </div>
  );
}
