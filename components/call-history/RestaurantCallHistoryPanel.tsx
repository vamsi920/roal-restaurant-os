"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { KdsEmptyStatePanel } from "@/components/dashboard/kds-workspace-states";
import { updateReservationRequestStatusAction } from "@/app/dashboard/restaurants/[id]/calls/actions";
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
  { id: "needs_action", label: "Needs action" },
  { id: "voicemail", label: "Voicemail" },
  { id: "reservations", label: "Reservations" },
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

function formatDuration(seconds: number | null): string | null {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return null;
  const rounded = Math.round(seconds);
  const minutes = Math.floor(rounded / 60);
  const rest = rounded % 60;
  if (minutes <= 0) return `${rest}s`;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

function formatPercent(value: number | null): string {
  return value == null ? "—" : `${value}%`;
}

function CommandCenterSummary({ snapshot }: { snapshot: CallHistorySnapshot }) {
  const { summary } = snapshot;
  const cards = [
    {
      label: "Active now",
      value: String(summary.activeCalls),
      note: "Calls still in progress",
      tone: summary.activeCalls > 0 ? "live" : "default",
    },
    {
      label: "Orders won",
      value: String(summary.completedOrders),
      note: `${formatPercent(summary.orderConversionPercent)} call-to-order`,
      tone: "success",
    },
    {
      label: "Needs action",
      value: String(summary.staffFollowUps + summary.openReservationRequests),
      note:
        summary.voicemailCalls > 0
          ? `${summary.voicemailCalls} voicemail${summary.voicemailCalls === 1 ? "" : "s"}`
          : "Callbacks, handoffs, tables",
      tone: summary.staffFollowUps + summary.openReservationRequests > 0 ? "warning" : "default",
    },
    {
      label: "Call evidence",
      value: `${summary.transcriptsAvailable}/${summary.totalCalls}`,
      note:
        summary.recordingsAvailable > 0
          ? `${summary.recordingsAvailable} recordings`
          : "Transcripts and summaries",
      tone: "default",
    },
  ];

  return (
    <div
      className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4"
      aria-label="Phone command center summary"
    >
      {cards.map((card) => (
        <div
          key={card.label}
          className={cn(
            "rounded-xl border px-3 py-3",
            card.tone === "live" &&
              "border-warning/30 bg-warning/10 text-amber-950",
            card.tone === "success" &&
              "border-success/20 bg-success/10 text-emerald-950",
            card.tone === "warning" &&
              "border-warning/30 bg-warning/10 text-amber-950",
            card.tone === "default" && "border-line bg-elev text-ink"
          )}
        >
          <p className="text-[0.68rem] font-semibold uppercase tracking-wide text-muted">
            {card.label}
          </p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">{card.value}</p>
          <p className="mt-0.5 text-xs text-muted">{card.note}</p>
        </div>
      ))}
    </div>
  );
}

function TranscriptPreview({
  row,
}: {
  row: CallHistorySnapshot["rows"][number];
}) {
  if (row.transcriptLines.length === 0 && !row.transcriptSummary) {
    return <span className="text-subtle">—</span>;
  }

  return (
    <details className="max-w-[22rem]">
      <summary className="cursor-pointer text-xs font-medium text-accent underline-offset-2 hover:underline">
        {row.transcriptLines.length > 0
          ? `${row.transcriptLines.length} lines`
          : "Summary"}
      </summary>
      <div className="mt-2 max-h-56 space-y-2 overflow-y-auto rounded-lg border border-line bg-elev p-2 text-xs">
        {row.transcriptSummary ? (
          <p className="border-b border-line/60 pb-2 text-muted [overflow-wrap:anywhere]">
            {row.transcriptSummary}
          </p>
        ) : null}
        {row.transcriptLines.map((line, index) => (
          <p key={`${line.speaker}-${index}`} className="[overflow-wrap:anywhere]">
            <span className="font-semibold text-ink">{line.speaker}: </span>
            <span className="text-muted">{line.text}</span>
          </p>
        ))}
      </div>
    </details>
  );
}

function FollowUpInbox({
  rows,
}: {
  rows: CallHistorySnapshot["rows"];
}) {
  const followUps = rows
    .filter((row) => row.needsStaffFollowUp && row.intent !== "voicemail")
    .slice(0, 5);
  if (followUps.length === 0) return null;

  return (
    <section
      className="border-b border-line bg-warning/5 px-4 py-4 sm:px-5"
      aria-labelledby="staff-follow-up-heading"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">
            Staff follow-up inbox
          </p>
          <h3
            id="staff-follow-up-heading"
            className="mt-1 text-base font-semibold text-ink"
          >
            Calls that need a human response
          </h3>
        </div>
        <p className="text-xs text-muted">
          {followUps.length} recent {followUps.length === 1 ? "call" : "calls"}
        </p>
      </div>

      <ul className="mt-3 grid gap-2">
        {followUps.map((row) => {
          const caller = formatCaller(row.callerPhone, row.callerName);
          return (
            <li
              key={row.sessionId}
              className="rounded-xl border border-warning/20 bg-elev px-3 py-2.5"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">
                    {row.followUpReason ?? "Staff follow-up"}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {caller.primary}
                    {caller.secondary ? ` · ${caller.secondary}` : ""} ·{" "}
                    {formatWhen(row.occurredAt)}
                  </p>
                </div>
                <span
                  className={cn(
                    "inline-flex w-fit rounded px-1.5 py-0.5 text-micro font-semibold uppercase",
                    OUTCOME_TONE[row.outcome] ?? OUTCOME_TONE.unknown
                  )}
                >
                  {row.outcomeLabel}
                </span>
              </div>
              {row.transcriptSummary ? (
                <p className="mt-2 text-sm text-muted [overflow-wrap:anywhere]">
                  {row.transcriptSummary}
                </p>
              ) : null}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[0.7rem] text-subtle">
                <span className="font-mono">{truncateSessionId(row.sessionId)}</span>
                {row.recordingUrl ? (
                  <a
                    href={row.recordingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-accent underline-offset-2 hover:underline"
                  >
                    Recording{formatDuration(row.durationSeconds) ? ` · ${formatDuration(row.durationSeconds)}` : ""}
                  </a>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function VoicemailInbox({
  rows,
}: {
  rows: CallHistorySnapshot["rows"];
}) {
  const voicemails = rows.filter((row) => row.intent === "voicemail").slice(0, 5);
  if (voicemails.length === 0) return null;

  return (
    <section
      className="border-b border-line bg-elev px-4 py-4 sm:px-5"
      aria-labelledby="voicemail-inbox-heading"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">
            Voicemail inbox
          </p>
          <h3
            id="voicemail-inbox-heading"
            className="mt-1 text-base font-semibold text-ink"
          >
            Messages that need a callback
          </h3>
        </div>
        <p className="text-xs text-muted">
          {voicemails.length} recent {voicemails.length === 1 ? "message" : "messages"}
        </p>
      </div>

      <ul className="mt-3 grid gap-2">
        {voicemails.map((row) => {
          const caller = formatCaller(row.callerPhone, row.callerName);
          return (
            <li
              key={row.sessionId}
              className="rounded-xl border border-accent/20 bg-card px-3 py-2.5"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">
                    {caller.primary}
                    {caller.secondary ? (
                      <span className="font-normal text-muted"> · {caller.secondary}</span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {formatWhen(row.occurredAt)} · {row.ownerActionLabel}
                  </p>
                </div>
                {row.recordingUrl ? (
                  <a
                    href={row.recordingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex w-fit rounded-lg border border-accent/20 bg-accent-soft px-2.5 py-1.5 text-xs font-semibold text-accent underline-offset-2 hover:underline"
                  >
                    Play recording
                    {formatDuration(row.durationSeconds)
                      ? ` · ${formatDuration(row.durationSeconds)}`
                      : ""}
                  </a>
                ) : (
                  <span className="inline-flex w-fit rounded-lg border border-line bg-elev px-2.5 py-1.5 text-xs font-semibold text-muted">
                    Transcript only
                  </span>
                )}
              </div>
              {row.transcriptSummary ? (
                <p className="mt-2 text-sm text-muted [overflow-wrap:anywhere]">
                  {row.transcriptSummary}
                </p>
              ) : null}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[0.7rem] text-subtle">
                <span className="font-mono">{truncateSessionId(row.sessionId)}</span>
                <span>{row.outcomeLabel}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ReservationInbox({
  restaurantId,
  rows,
}: {
  restaurantId: string;
  rows: CallHistorySnapshot["reservationRequests"];
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const open = rows.filter((row) => row.status === "requested").slice(0, 6);
  if (open.length === 0) return null;

  async function updateStatus(
    requestId: string,
    status: "confirmed" | "declined"
  ) {
    setError(null);
    setPendingId(requestId);
    try {
      await updateReservationRequestStatusAction(restaurantId, requestId, status);
      router.refresh();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not update reservation request."
      );
    } finally {
      setPendingId(null);
    }
  }

  return (
    <section
      className="border-b border-line bg-accent-soft/40 px-4 py-4 sm:px-5"
      aria-labelledby="reservation-requests-heading"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">
            Reservation requests
          </p>
          <h3
            id="reservation-requests-heading"
            className="mt-1 text-base font-semibold text-ink"
          >
            Staff needs to confirm these tables
          </h3>
        </div>
        <p className="text-xs text-muted">
          {open.length} open {open.length === 1 ? "request" : "requests"}
        </p>
      </div>
      {error ? (
        <p className="mt-2 rounded-lg border border-danger/20 bg-danger/10 px-3 py-2 text-xs font-medium text-danger">
          {error}
        </p>
      ) : null}

      <ul className="mt-3 grid gap-2 md:grid-cols-2">
        {open.map((row) => (
          <li
            key={row.id}
            className="rounded-xl border border-accent/20 bg-card px-3 py-2.5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">
                  {row.partySize} at {row.requestedTime}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {row.requestedDate} · {row.customerName} · {row.customerPhone}
                </p>
              </div>
              <span className="rounded bg-accent-soft px-1.5 py-0.5 text-micro font-semibold uppercase text-accent">
                Request
              </span>
            </div>
            {row.notes ? (
              <p className="mt-2 text-xs text-muted [overflow-wrap:anywhere]">
                {row.notes}
              </p>
            ) : null}
            <p className="mt-2 text-[0.7rem] text-subtle">
              Created {formatWhen(row.createdAt)}
              {row.sessionId ? ` · ${truncateSessionId(row.sessionId)}` : ""}
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => void updateStatus(row.id, "confirmed")}
                disabled={pendingId === row.id}
                className="kds-thumb-btn min-h-10 rounded-lg border border-success/30 bg-success/10 px-3 text-xs font-semibold text-success hover:bg-success/15 disabled:cursor-wait disabled:opacity-60"
              >
                {pendingId === row.id ? "Updating..." : "Mark confirmed"}
              </button>
              <button
                type="button"
                onClick={() => void updateStatus(row.id, "declined")}
                disabled={pendingId === row.id}
                className="kds-thumb-btn min-h-10 rounded-lg border border-line bg-elev px-3 text-xs font-semibold text-muted hover:text-ink disabled:cursor-wait disabled:opacity-60"
              >
                Decline
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
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
          Live and recent phone sessions with orders, reservations, transcripts, recordings,
          and staff follow-up. Last {CALL_HISTORY_DEFAULT_RANGE_DAYS} days ({rangeLabel}).
        </p>
        <CommandCenterSummary snapshot={snapshot} />

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
      <ReservationInbox
        restaurantId={snapshot.restaurantId}
        rows={snapshot.reservationRequests}
      />
      <VoicemailInbox rows={snapshot.rows} />
      <FollowUpInbox rows={snapshot.rows} />

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
              <table className="call-history__table w-full min-w-[60rem] text-left text-sm">
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
                      Intent
                    </th>
                    <th scope="col" className="px-2 py-2">
                      Session
                    </th>
                    <th scope="col" className="px-2 py-2">
                      Recording
                    </th>
                    <th scope="col" className="px-2 py-2">
                      Transcript
                    </th>
                    <th scope="col" className="px-2 py-2">
                      Outcome
                    </th>
                    <th scope="col" className="px-2 py-2">
                      Owner action
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
                        <td className="px-2 py-2.5 align-top">
                          <span className="inline-flex rounded bg-accent-soft px-1.5 py-0.5 text-micro font-semibold uppercase text-accent">
                            {row.intentLabel}
                          </span>
                        </td>
                        <td className="px-2 py-2.5 align-top font-mono text-xs text-muted">
                          <span title={row.sessionId}>
                            {truncateSessionId(row.sessionId)}
                          </span>
                        </td>
                        <td className="px-2 py-2.5 align-top text-xs">
                          {row.recordingUrl ? (
                            <a
                              href={row.recordingUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="font-medium text-accent underline-offset-2 hover:underline"
                            >
                              Recording
                              {formatDuration(row.durationSeconds)
                                ? ` · ${formatDuration(row.durationSeconds)}`
                                : ""}
                            </a>
                          ) : (
                            <span className="text-subtle">—</span>
                          )}
                        </td>
                        <td className="px-2 py-2.5 align-top">
                          <TranscriptPreview row={row} />
                        </td>
                        <td className="px-2 py-2.5 align-top">
                          <div className="flex flex-col items-start gap-1">
                            <span
                              className={cn(
                                "inline-block rounded px-1.5 py-0.5 text-micro font-semibold uppercase",
                                OUTCOME_TONE[row.outcome] ?? OUTCOME_TONE.unknown
                              )}
                            >
                              {row.outcomeLabel}
                            </span>
                            {row.needsStaffFollowUp ? (
                              <span className="rounded bg-warning/15 px-1.5 py-0.5 text-micro font-semibold uppercase text-amber-900">
                                Follow up
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="max-w-[12rem] px-2 py-2.5 align-top text-xs text-muted">
                          <span
                            className={cn(
                              row.isActionable && "font-semibold text-ink"
                            )}
                          >
                            {row.ownerActionLabel}
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
