"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  Phone,
  PhoneCall,
  PhoneForwarded,
  PhoneMissed,
  Play,
  ShoppingBag,
  Timer,
  Undo2,
  Voicemail,
  type LucideIcon,
} from "lucide-react";
import { updateReservationRequestStatusAction } from "@/app/dashboard/restaurants/[id]/calls/actions";
import {
  Badge,
  EmptyState,
  IconTile,
  Panel,
  StatCard,
  formatRelative,
  type TileColor,
  type Tone,
} from "@/components/ui";
import { Notice, RefreshButton } from "@/components/live-orders/workspace-ui";
import { DrawerSection, SideDrawer } from "@/components/live-orders/SideDrawer";
import { TranscriptBubbles } from "@/components/call-history/TranscriptBubbles";
import { CALL_HISTORY_DEFAULT_RANGE_DAYS } from "@/lib/call-history/load-call-history";
import type {
  CallHistoryRow,
  CallHistorySnapshot,
  ReservationRequestRow,
} from "@/lib/call-history/types";
import { parseOrderLineItems } from "@/lib/orders/line-items";
import {
  isOpenReservationStatus,
  normalizeReservationStatus,
  reservationNextOwnerAction,
  reservationStatusLabel,
  type ReservationOwnerUpdateStatus,
} from "@/lib/restaurant-reservations/schema";
import { cn } from "@/lib/cn";

/* -------------------------------------------------------------------------- */
/* Filters                                                                    */
/* -------------------------------------------------------------------------- */

type CallsFilter = "all" | "orders" | "follow_ups" | "voicemail" | "reservations";

const FILTERS: { id: CallsFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "orders", label: "Orders" },
  { id: "follow_ups", label: "Follow-ups" },
  { id: "voicemail", label: "Voicemail" },
  { id: "reservations", label: "Reservations" },
];

function isLive(row: CallHistoryRow): boolean {
  return row.status === "active" || row.outcome === "in_progress";
}

function isOrderRow(row: CallHistoryRow): boolean {
  return row.outcome === "order_completed" || row.intent === "order";
}

function needsFollowUp(row: CallHistoryRow): boolean {
  return (row.needsStaffFollowUp || row.isActionable) && !isLive(row);
}

function matchesFilter(row: CallHistoryRow, filter: CallsFilter, handled: Set<string>): boolean {
  switch (filter) {
    case "orders":
      return isOrderRow(row);
    case "follow_ups":
      return needsFollowUp(row) && !handled.has(row.sessionId);
    case "voicemail":
      return row.intent === "voicemail";
    case "reservations":
      return row.intent === "reservation";
    default:
      return true;
  }
}

/* -------------------------------------------------------------------------- */
/* Formatting                                                                 */
/* -------------------------------------------------------------------------- */

function formatWhen(iso: string): string {
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(ms);
}

function formatDuration(seconds: number | null): string | null {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return null;
  const rounded = Math.round(seconds);
  const minutes = Math.floor(rounded / 60);
  const rest = rounded % 60;
  if (minutes <= 0) return `${rest}s`;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

function callerLabel(row: { callerName: string | null; callerPhone: string | null }) {
  const name = row.callerName?.trim();
  const phone = row.callerPhone?.trim() || null;
  if (name) return { primary: name, secondary: phone };
  if (phone) return { primary: phone, secondary: null };
  return { primary: "Unknown caller", secondary: null };
}

function dialHref(phone: string | null | undefined): string | null {
  const digits = phone?.replace(/[^\d+]/g, "") ?? "";
  return digits.length >= 7 ? `tel:${digits}` : null;
}

function isSameLocalDay(iso: string, now: Date): boolean {
  const d = new Date(iso);
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

type RowLook = { icon: LucideIcon; tile: TileColor };

function rowLook(row: CallHistoryRow): RowLook {
  if (isLive(row)) return { icon: PhoneCall, tile: "amber" };
  if (isOrderRow(row)) return { icon: ShoppingBag, tile: "green" };
  if (row.intent === "voicemail") return { icon: Voicemail, tile: "blue" };
  if (row.intent === "reservation") return { icon: CalendarClock, tile: "orange" };
  if (row.intent === "handoff") return { icon: PhoneForwarded, tile: "rose" };
  if (row.outcome === "abandoned" || row.outcome === "canceled") return { icon: PhoneMissed, tile: "rose" };
  return { icon: Phone, tile: "blue" };
}

function outcomeBadge(row: CallHistoryRow, handled: boolean): { tone: Tone; label: string } {
  if (isLive(row)) return { tone: "live", label: "Live" };
  if (row.outcome === "order_completed") return { tone: "ok", label: "Confirmed" };
  if (needsFollowUp(row)) return handled ? { tone: "neutral", label: "Handled" } : { tone: "warn", label: "Follow up" };
  if (row.outcome === "canceled" || row.outcome === "abandoned") return { tone: "bad", label: row.outcomeLabel };
  if (row.intent === "voicemail") return { tone: "info", label: "Voicemail" };
  return { tone: "neutral", label: row.intent === "faq" ? "Answered" : row.outcomeLabel };
}

function rowSublabel(row: CallHistoryRow): string {
  const parts = [row.intentLabel];
  if (row.fulfillmentLabel) parts.push(row.fulfillmentLabel);
  if (row.lineCount > 0) parts.push(`${row.lineCount} item${row.lineCount === 1 ? "" : "s"}`);
  const duration = formatDuration(row.durationSeconds);
  if (duration) parts.push(duration);
  if (row.callerLanguageLabel) parts.push(row.callerLanguageLabel);
  if (row.isTestHarness) parts.push("Test call");
  return parts.join(" · ");
}

/* -------------------------------------------------------------------------- */
/* "Handled" marks (per device)                                               */
/* -------------------------------------------------------------------------- */

/**
 * Follow-ups have no server-side "handled" column yet, so the mark lives in this
 * browser. It only hides the call from the Follow-ups filter and stat.
 */
function useHandledCalls(restaurantId: string) {
  const key = `roal:handled-calls:${restaurantId}`;
  const [handled, setHandled] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      const ids = raw ? (JSON.parse(raw) as unknown) : [];
      if (Array.isArray(ids)) setHandled(new Set(ids.filter((v): v is string => typeof v === "string")));
    } catch {
      // Storage blocked or corrupt: start empty.
    }
  }, [key]);

  const toggle = useCallback(
    (sessionId: string) => {
      setHandled((prev) => {
        const next = new Set(prev);
        if (next.has(sessionId)) next.delete(sessionId);
        else next.add(sessionId);
        try {
          window.localStorage.setItem(key, JSON.stringify([...next].slice(-500)));
        } catch {
          // Non-fatal: the mark still applies for this visit.
        }
        return next;
      });
    },
    [key]
  );

  return { handled, toggle };
}

/* -------------------------------------------------------------------------- */
/* Summary                                                                    */
/* -------------------------------------------------------------------------- */

function CallsSummary({
  snapshot,
  followUpCount,
}: {
  snapshot: CallHistorySnapshot;
  followUpCount: number;
}) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);

  const callsToday = now ? snapshot.rows.filter((row) => isSameLocalDay(row.occurredAt, now)).length : null;
  const durations = snapshot.rows
    .map((row) => row.durationSeconds)
    .filter((s): s is number => s != null && Number.isFinite(s) && s > 0);
  const avgSeconds = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : null;
  const { summary } = snapshot;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Calls summary">
      <StatCard
        label="Calls today"
        value={callsToday ?? "—"}
        hint={`${summary.totalCalls} in the last ${CALL_HISTORY_DEFAULT_RANGE_DAYS} days`}
        icon={Phone}
        color="blue"
      />
      <StatCard
        label="Orders"
        value={summary.completedOrders}
        hint={
          summary.orderConversionPercent != null
            ? `${summary.orderConversionPercent}% of calls ordered`
            : "Completed phone orders"
        }
        icon={ShoppingBag}
        color="green"
      />
      <StatCard
        label="Needs follow-up"
        value={followUpCount}
        hint={
          summary.openReservationRequests > 0
            ? `${summary.openReservationRequests} table request${summary.openReservationRequests === 1 ? "" : "s"} open`
            : "Callbacks and handoffs"
        }
        icon={PhoneForwarded}
        color={followUpCount > 0 ? "amber" : "orange"}
      />
      <StatCard
        label="Avg call length"
        value={formatDuration(avgSeconds) ?? "—"}
        hint={durations.length > 0 ? `Across ${durations.length} timed call${durations.length === 1 ? "" : "s"}` : "No timed calls yet"}
        icon={Timer}
        color="orange"
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Reservations                                                               */
/* -------------------------------------------------------------------------- */

const RESERVATION_TONE: Record<string, Tone> = {
  requested: "info",
  contacted: "warn",
  confirmed: "ok",
  declined: "bad",
  canceled: "neutral",
};

function ReservationRequests({
  restaurantId,
  rows,
}: {
  restaurantId: string;
  rows: ReservationRequestRow[];
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recent = rows.slice(0, 20);
  const openCount = rows.filter((row) => isOpenReservationStatus(row.status)).length;

  async function updateStatus(requestId: string, status: ReservationOwnerUpdateStatus) {
    setError(null);
    setPendingId(requestId);
    try {
      await updateReservationRequestStatusAction(restaurantId, requestId, status);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update reservation request.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <Panel
      flush
      title="Table requests"
      action={<span className="text-[12.5px] text-subtle">{openCount} open · {recent.length} recent</span>}
    >
      {error ? <Notice tone="bad" className="mx-4 mt-3">{error}</Notice> : null}
      {recent.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No table requests"
          body="When a caller asks for a table, the request lands here for you to confirm."
        />
      ) : (
        <ul>
          {recent.map((row) => {
            const open = isOpenReservationStatus(row.status);
            const busy = pendingId === row.id;
            const tel = dialHref(row.customerPhone);
            return (
              <li key={row.id} className="list-row flex-wrap items-start sm:flex-nowrap">
                <IconTile icon={CalendarClock} color="orange" />
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-ink">
                    Party of {row.partySize} · {row.requestedDate} at {row.requestedTime}
                  </p>
                  <p className="truncate text-[12.5px] text-subtle">
                    {row.customerName || "Guest"}
                    {row.customerPhone ? ` · ${row.customerPhone}` : ""} · {formatRelative(row.createdAt)}
                  </p>
                  {row.notes ? (
                    <p className="mt-1 text-[13px] text-muted [overflow-wrap:anywhere]">{row.notes}</p>
                  ) : null}
                  <p className="mt-1 text-[12.5px] font-medium text-muted">
                    Next: {reservationNextOwnerAction(row.status)}
                  </p>
                  {open ? (
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {tel ? (
                        <a href={tel} className="btn-ghost btn-sm">
                          <Phone size={13} aria-hidden />
                          Call guest
                        </a>
                      ) : null}
                      {normalizeReservationStatus(row.status) === "requested" ? (
                        <button
                          type="button"
                          onClick={() => void updateStatus(row.id, "contacted")}
                          disabled={busy}
                          className="btn-ghost btn-sm"
                        >
                          Mark contacted
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => void updateStatus(row.id, "confirmed")}
                        disabled={busy}
                        className="btn-primary btn-sm"
                      >
                        {busy ? "Updating…" : "Confirm table"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void updateStatus(row.id, "declined")}
                        disabled={busy}
                        className="btn-ghost btn-sm text-muted"
                      >
                        Decline
                      </button>
                      <button
                        type="button"
                        onClick={() => void updateStatus(row.id, "canceled")}
                        disabled={busy}
                        className="btn-ghost btn-sm text-muted"
                      >
                        Close
                      </button>
                    </div>
                  ) : null}
                </div>
                <Badge tone={RESERVATION_TONE[normalizeReservationStatus(row.status)] ?? "neutral"}>
                  {reservationStatusLabel(row.status)}
                </Badge>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

/* -------------------------------------------------------------------------- */
/* Call row + drawer                                                          */
/* -------------------------------------------------------------------------- */

function CallRow({
  row,
  handled,
  onOpen,
}: {
  row: CallHistoryRow;
  handled: boolean;
  onOpen: () => void;
}) {
  const caller = callerLabel(row);
  const look = rowLook(row);
  const badge = outcomeBadge(row, handled);
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="list-row w-full text-left focus-visible:-outline-offset-2"
        aria-haspopup="dialog"
      >
        <IconTile icon={look.icon} color={look.tile} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-semibold text-ink">{caller.primary}</span>
          <span className="block truncate text-[12.5px] text-subtle">
            {rowSublabel(row)}
            {row.transcriptSummary ? ` — ${row.transcriptSummary}` : ""}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <span className="flex items-center gap-1.5">
            {row.totalLabel && row.outcome === "order_completed" ? (
              <span className="font-mono text-[13.5px] font-semibold tabular-nums text-ink">{row.totalLabel}</span>
            ) : null}
            <Badge tone={badge.tone}>{badge.label}</Badge>
          </span>
          <time className="text-[12px] tabular-nums text-subtle" dateTime={row.occurredAt}>
            {isLive(row) ? "now" : formatRelative(row.occurredAt)}
          </time>
        </span>
      </button>
    </li>
  );
}

function CallDrawer({
  row,
  hostName,
  items,
  handled,
  onToggleHandled,
  onClose,
}: {
  row: CallHistoryRow | null;
  hostName: string;
  items: unknown;
  handled: boolean;
  onToggleHandled: () => void;
  onClose: () => void;
}) {
  const caller = row ? callerLabel(row) : null;
  const tel = row ? dialHref(row.callerPhone) : null;
  const lines = useMemo(() => (items == null ? [] : parseOrderLineItems(items)), [items]);
  const badge = row ? outcomeBadge(row, handled) : null;
  const followUp = row ? needsFollowUp(row) : false;

  return (
    <SideDrawer
      open={!!row}
      onClose={onClose}
      titleId="call-drawer-title"
      closeLabel="Close call details"
      title={caller?.primary ?? "Call"}
      subtitle={
        row
          ? [caller?.secondary, formatWhen(row.occurredAt), formatDuration(row.durationSeconds)]
              .filter(Boolean)
              .join(" · ")
          : null
      }
      badge={badge ? <Badge tone={badge.tone}>{badge.label}</Badge> : null}
      footer={
        row && (followUp || tel) ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            {followUp ? (
              <button type="button" onClick={onToggleHandled} className="btn-ghost w-full sm:w-auto">
                {handled ? <Undo2 size={15} aria-hidden /> : <CheckCircle2 size={15} aria-hidden />}
                {handled ? "Mark not handled" : "Mark handled"}
              </button>
            ) : null}
            {tel ? (
              <a href={tel} className="btn-primary w-full sm:w-auto">
                <Phone size={15} aria-hidden />
                Call back
              </a>
            ) : null}
          </div>
        ) : null
      }
    >
      {row ? (
        <>
          {followUp ? (
            <Notice tone={handled ? "ok" : "warn"} className="mb-5">
              <span className="font-semibold">{row.followUpReason ?? row.ownerActionLabel}</span>
              {handled ? " · marked handled on this device" : null}
            </Notice>
          ) : null}

          <DrawerSection title="Summary">
            {row.transcriptSummary ? (
              <p className="text-[14px] leading-relaxed text-ink [overflow-wrap:anywhere]">{row.transcriptSummary}</p>
            ) : (
              <p className="text-[13px] text-subtle">No summary for this call.</p>
            )}
            <dl className="mt-3 grid grid-cols-2 gap-2 text-[12.5px]">
              <div className="rounded-[10px] bg-elev px-3 py-2">
                <dt className="text-subtle">Intent</dt>
                <dd className="font-semibold text-ink">{row.intentLabel}</dd>
              </div>
              <div className="rounded-[10px] bg-elev px-3 py-2">
                <dt className="text-subtle">Outcome</dt>
                <dd className="font-semibold text-ink">{row.outcomeLabel}</dd>
              </div>
              {!followUp ? (
                <div className="col-span-2 rounded-[10px] bg-elev px-3 py-2">
                  <dt className="text-subtle">Next step</dt>
                  <dd className="font-semibold text-ink">{row.ownerActionLabel}</dd>
                </div>
              ) : null}
            </dl>
          </DrawerSection>

          {row.lineCount > 0 || lines.length > 0 ? (
            <DrawerSection
              title={`Order${row.fulfillmentLabel ? ` · ${row.fulfillmentLabel}` : ""}`}
              action={
                row.totalLabel ? (
                  <span className="font-mono text-[14px] font-bold tabular-nums text-ink">{row.totalLabel}</span>
                ) : null
              }
            >
              {lines.length > 0 ? (
                <ul className="divide-y divide-line rounded-[12px] border border-line">
                  {lines.map((line, i) => (
                    <li key={i} className="flex gap-2.5 px-3 py-2">
                      <span className="w-6 shrink-0 font-mono text-[13.5px] font-bold tabular-nums">{line.quantity}×</span>
                      <span className="min-w-0">
                        <span className="block text-[13.5px] font-semibold text-ink [overflow-wrap:anywhere]">{line.name}</span>
                        {line.customizations.length > 0 ? (
                          <span className="block text-[12.5px] text-muted">{line.customizations.join(" · ")}</span>
                        ) : null}
                        {line.notes ? <span className="kds-ticket__note mt-1 block">{line.notes}</span> : null}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-subtle">
                  {row.lineCount} item{row.lineCount === 1 ? "" : "s"} on this order. Open the Kitchen board for the ticket.
                </p>
              )}
            </DrawerSection>
          ) : null}

          <DrawerSection
            title="Transcript"
            action={
              row.recordingUrl ? (
                <a href={row.recordingUrl} target="_blank" rel="noreferrer" className="btn-ghost btn-sm">
                  <Play size={13} aria-hidden />
                  Recording
                  {formatDuration(row.durationSeconds) ? ` · ${formatDuration(row.durationSeconds)}` : ""}
                </a>
              ) : null
            }
          >
            {row.transcriptLines.length > 0 ? (
              <TranscriptBubbles lines={row.transcriptLines} hostName={hostName} />
            ) : (
              <p className="text-[13px] text-subtle">
                {isLive(row) ? "The call is still going — the transcript arrives when it ends." : "No transcript was saved for this call."}
              </p>
            )}
          </DrawerSection>

          <details className="mt-6 rounded-[10px] border border-line px-3 py-2">
            <summary className="cursor-pointer text-[12.5px] font-medium text-subtle">Call reference</summary>
            <p className="mt-2 break-all font-mono text-[12px] text-subtle">{row.sessionId}</p>
          </details>
        </>
      ) : null}
    </SideDrawer>
  );
}

/* -------------------------------------------------------------------------- */
/* Panel                                                                      */
/* -------------------------------------------------------------------------- */

export function RestaurantCallHistoryPanel({
  snapshot,
  hostName = "Your host",
  orderItemsBySession = {},
}: {
  snapshot: CallHistorySnapshot;
  hostName?: string;
  orderItemsBySession?: Record<string, unknown>;
}) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [filter, setFilter] = useState<CallsFilter>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const { handled, toggle } = useHandledCalls(snapshot.restaurantId);

  const sorted = useMemo(
    () =>
      [...snapshot.rows].sort((a, b) => {
        const live = Number(isLive(b)) - Number(isLive(a));
        if (live !== 0) return live;
        return new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime();
      }),
    [snapshot.rows]
  );

  const counts = useMemo(() => {
    const out: Record<CallsFilter, number> = { all: 0, orders: 0, follow_ups: 0, voicemail: 0, reservations: 0 };
    for (const row of sorted) {
      for (const f of FILTERS) if (matchesFilter(row, f.id, handled)) out[f.id] += 1;
    }
    return out;
  }, [sorted, handled]);

  const filtered = useMemo(
    () => sorted.filter((row) => matchesFilter(row, filter, handled)),
    [sorted, filter, handled]
  );

  const openRow = openId ? snapshot.rows.find((row) => row.sessionId === openId) ?? null : null;
  const openReservations = snapshot.reservationRequests.filter((r) => isOpenReservationStatus(r.status)).length;
  const followUpCount = counts.follow_ups;

  return (
    <div className="space-y-5">
      <CallsSummary snapshot={snapshot} followUpCount={followUpCount} />

      {filter !== "reservations" && openReservations > 0 ? (
        <Notice
          tone="warn"
          title={`${openReservations} table request${openReservations === 1 ? "" : "s"} waiting.`}
          action={
            <button type="button" className="btn-ghost btn-sm" onClick={() => setFilter("reservations")}>
              Review
            </button>
          }
        >
          Confirm or decline so guests aren&apos;t left guessing.
        </Notice>
      ) : null}

      {filter === "reservations" ? (
        <ReservationRequests restaurantId={snapshot.restaurantId} rows={snapshot.reservationRequests} />
      ) : null}

      <Panel
        flush
        className="call-history"
        title={
          <span id="call-history-heading">
            {filter === "reservations" ? "Reservation calls" : "Calls"}
          </span>
        }
        action={
          <RefreshButton
            onClick={() => startRefresh(() => router.refresh())}
            busy={refreshing}
            label="Refresh calls"
          />
        }
      >
        <div className="overflow-x-auto border-b border-line px-[1.125rem] py-2.5 [scrollbar-width:none]">
          <div className="seg" role="group" aria-label="Filter calls">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={filter === f.id}
                onClick={() => setFilter(f.id)}
                className="min-h-8 shrink-0 gap-1.5 whitespace-nowrap"
              >
                {f.label}
                {counts[f.id] > 0 ? <span className="tabular-nums text-subtle">{counts[f.id]}</span> : null}
              </button>
            ))}
          </div>
        </div>

        {snapshot.isEmpty ? (
          <EmptyState
            icon={PhoneCall}
            title="No calls yet"
            body={`When ${hostName} answers a call, it shows up here with the summary, transcript, and any order.`}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={filter === "follow_ups" ? CheckCircle2 : Clock}
            title={filter === "follow_ups" ? "You're all caught up" : "Nothing in this view"}
            body={
              filter === "follow_ups"
                ? "No callbacks or handoffs waiting on you."
                : `No ${FILTERS.find((f) => f.id === filter)?.label.toLowerCase()} calls in the last ${CALL_HISTORY_DEFAULT_RANGE_DAYS} days.`
            }
          />
        ) : (
          <ul className="divide-y divide-line/70" aria-labelledby="call-history-heading">
            {filtered.map((row) => (
              <CallRow
                key={row.sessionId}
                row={row}
                handled={handled.has(row.sessionId)}
                onOpen={() => setOpenId(row.sessionId)}
              />
            ))}
          </ul>
        )}
        {!snapshot.isEmpty && filtered.length > 0 ? (
          <p className={cn("border-t border-line px-[1.125rem] py-2 text-[12px] text-subtle")} role="status">
            Showing {filtered.length} of {snapshot.rows.length} calls
          </p>
        ) : null}
      </Panel>

      <CallDrawer
        row={openRow}
        hostName={hostName}
        items={openRow ? orderItemsBySession[openRow.sessionId] ?? null : null}
        handled={openRow ? handled.has(openRow.sessionId) : false}
        onToggleHandled={() => openRow && toggle(openRow.sessionId)}
        onClose={() => setOpenId(null)}
      />
    </div>
  );
}
