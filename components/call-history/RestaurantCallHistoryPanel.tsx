"use client";

import { useMemo, useState } from "react";
import { KdsEmptyStatePanel } from "@/components/dashboard/kds-workspace-states";
import { filterCallHistoryRows } from "@/lib/call-history/build-call-history-rows";
import { CALL_HISTORY_DEFAULT_RANGE_DAYS } from "@/lib/call-history/load-call-history";
import type {
  CallHistoryOutcomeFilter,
  CallHistorySnapshot,
} from "@/lib/call-history/types";
import { cn } from "@/lib/cn";

const FILTERS: { id: CallHistoryOutcomeFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "completed", label: "Completed" },
  { id: "active", label: "Active" },
  { id: "failed", label: "Failed" },
  { id: "other", label: "Other" },
];

function formatWhen(iso: string): string {
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  }).format(ms);
}

function formatCaller(
  phone: string | null,
  name: string | null
): { primary: string; secondary: string | null } {
  if (name?.trim()) {
    return {
      primary: name.trim(),
      secondary: phone?.trim() || null,
    };
  }
  if (phone?.trim()) {
    return { primary: phone.trim(), secondary: null };
  }
  return { primary: "—", secondary: null };
}

function truncateSessionId(sessionId: string): string {
  if (sessionId.length <= 14) return sessionId;
  return `${sessionId.slice(0, 8)}…${sessionId.slice(-4)}`;
}

const OUTCOME_TONE: Record<string, string> = {
  order_completed: "bg-success/15 text-success",
  in_progress: "bg-warning/15 text-amber-900",
  canceled: "bg-danger/10 text-danger",
  abandoned: "bg-danger/10 text-danger",
  no_order: "bg-elev text-muted",
  unknown: "bg-elev text-muted",
};

export function RestaurantCallHistoryPanel({
  snapshot,
}: {
  snapshot: CallHistorySnapshot;
}) {
  const [filter, setFilter] = useState<CallHistoryOutcomeFilter>("all");

  const filtered = useMemo(
    () => filterCallHistoryRows(snapshot.rows, filter),
    [snapshot.rows, filter]
  );

  const rangeLabel = `${formatWhen(snapshot.rangeSince)} – ${formatWhen(snapshot.rangeUntil)}`;

  return (
    <section
      className="call-history min-w-0 rounded-2xl border border-line bg-card shadow-sm"
      aria-labelledby="call-history-heading"
    >
      <header className="border-b border-line px-4 py-4 sm:px-5">
        <h2
          id="call-history-heading"
          className="text-lg font-semibold tracking-tight text-ink"
        >
          Call history &amp; outcomes
        </h2>
        <p className="mt-1 text-sm text-muted">
          Sessions from draft orders, receipts, and usage events. Last{" "}
          {CALL_HISTORY_DEFAULT_RANGE_DAYS} days ({rangeLabel}).
        </p>

        <div
          className="mt-3 flex flex-wrap gap-2"
          role="group"
          aria-label="Filter by outcome"
        >
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "kds-thumb-btn min-h-10 rounded-lg border px-3 text-xs font-medium transition-colors",
                filter === f.id
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-line bg-elev text-muted hover:text-ink"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </header>

      <div className="min-w-0 p-3 sm:p-4">
        {snapshot.isEmpty ? (
          <KdsEmptyStatePanel tone="calm" icon="orders" title="No calls yet">
            History appears when guests call and tool or order activity is
            recorded.
          </KdsEmptyStatePanel>
        ) : filtered.length === 0 ? (
          <KdsEmptyStatePanel tone="tab" title="No calls in this filter">
            Try another outcome filter or check back after the next call.
          </KdsEmptyStatePanel>
        ) : (
          <>
            <p className="mb-3 text-caption text-subtle" role="status">
              Showing {filtered.length} of {snapshot.rows.length} sessions
            </p>
            <div className="call-history__table-wrap min-w-0 overflow-x-auto">
              <table className="call-history__table w-full min-w-[36rem] text-left text-sm">
                <caption className="sr-only">
                  Phone call sessions and outcomes
                </caption>
                <thead>
                  <tr className="border-b border-line text-xs font-semibold uppercase tracking-wider text-subtle">
                    <th scope="col" className="px-2 py-2">
                      Time
                    </th>
                    <th scope="col" className="px-2 py-2">
                      Caller
                    </th>
                    <th scope="col" className="px-2 py-2">
                      Session
                    </th>
                    <th scope="col" className="px-2 py-2">
                      Outcome
                    </th>
                    <th scope="col" className="px-2 py-2 text-right">
                      Items
                    </th>
                    <th scope="col" className="px-2 py-2 text-right">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => {
                    const caller = formatCaller(row.callerPhone, row.callerName);
                    return (
                      <tr
                        key={row.sessionId}
                        className="border-b border-line/60 last:border-0"
                      >
                        <td className="whitespace-nowrap px-2 py-2.5 align-top">
                          <time dateTime={row.occurredAt}>
                            {formatWhen(row.occurredAt)}
                          </time>
                        </td>
                        <td className="min-w-[7rem] px-2 py-2.5 align-top">
                          <span className="font-medium text-ink">
                            {caller.primary}
                          </span>
                          {caller.secondary ? (
                            <span className="mt-0.5 block text-xs text-muted">
                              {caller.secondary}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-2 py-2.5 align-top font-mono text-xs text-muted">
                          <span title={row.sessionId}>
                            {truncateSessionId(row.sessionId)}
                          </span>
                        </td>
                        <td className="px-2 py-2.5 align-top">
                          <span
                            className={cn(
                              "inline-block rounded px-1.5 py-0.5 text-micro font-semibold uppercase",
                              OUTCOME_TONE[row.outcome] ?? OUTCOME_TONE.unknown
                            )}
                          >
                            {row.outcomeLabel}
                          </span>
                        </td>
                        <td className="px-2 py-2.5 text-right align-top tabular-nums text-ink">
                          {row.lineCount > 0 ? row.lineCount : "—"}
                        </td>
                        <td className="px-2 py-2.5 text-right align-top tabular-nums text-ink">
                          {row.totalLabel ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
