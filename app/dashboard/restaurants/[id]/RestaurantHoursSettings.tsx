"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveRestaurantHoursAction } from "./hours-actions";
import { DAY_LABELS } from "@/lib/restaurant-hours/core";
import { Clock, Plus, Trash2 } from "lucide-react";
import { Badge, type Tone } from "@/components/ui";
import { Notice, SaveRow } from "@/components/live-orders/workspace-ui";
import type { RestaurantHoursBundle } from "@/lib/restaurant-hours/types";
import { CheckRow, SettingsPanel, SubHeading } from "./menu/menu-ui";

type Props = {
  restaurantId: string;
  bundle: RestaurantHoursBundle;
};

type WeeklyFormRow = {
  day_of_week: number;
  is_closed: boolean;
  open_time: string;
  close_time: string;
};

type ExceptionFormRow = {
  exception_date: string;
  label: string;
  is_closed: boolean;
  open_time: string;
  close_time: string;
};

function toWeeklyForm(bundle: RestaurantHoursBundle): WeeklyFormRow[] {
  return DAY_LABELS.map((_, dow) => {
    const row = bundle.weekly.find((w) => w.day_of_week === dow);
    return {
      day_of_week: dow,
      is_closed: row?.is_closed ?? false,
      open_time: row?.open_time ?? "11:00",
      close_time: row?.close_time ?? "21:00",
    };
  });
}

function toExceptionForm(bundle: RestaurantHoursBundle): ExceptionFormRow[] {
  return bundle.exceptions.map((e) => ({
    exception_date: e.exception_date,
    label: e.label ?? "",
    is_closed: e.is_closed,
    open_time: e.open_time ?? "11:00",
    close_time: e.close_time ?? "21:00",
  }));
}

function statusTone(status: string): Tone {
  if (status === "open") return "ok";
  if (status === "temporarily_closed") return "warn";
  return "bad";
}

function noticeTone(status: string): "ok" | "warn" | "bad" {
  const tone = statusTone(status);
  return tone === "ok" ? "ok" : tone === "warn" ? "warn" : "bad";
}

export function RestaurantHoursSettings({ restaurantId, bundle }: Props) {
  const router = useRouter();
  const [temporarilyClosed, setTemporarilyClosed] = useState(
    bundle.profile.temporarily_closed
  );
  const [temporarilyClosedReason, setTemporarilyClosedReason] = useState(
    bundle.profile.temporarily_closed_reason ?? ""
  );
  const [weekly, setWeekly] = useState(() => toWeeklyForm(bundle));
  const [exceptions, setExceptions] = useState(() => toExceptionForm(bundle));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const liveStatus = bundle.evaluation;

  const previewLabel = useMemo(() => {
    if (temporarilyClosed) return "Temporarily closed";
    if (liveStatus.ordering_allowed) return "Open for orders now";
    return "Closed for orders now";
  }, [temporarilyClosed, liveStatus.ordering_allowed]);

  function addException() {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + 1);
    setExceptions((prev) => [
      ...prev,
      {
        exception_date: d.toISOString().slice(0, 10),
        label: "Holiday",
        is_closed: true,
        open_time: "11:00",
        close_time: "21:00",
      },
    ]);
    setSaved(false);
  }

  function updateWeekly(idx: number, patch: Partial<WeeklyFormRow>) {
    setSaved(false);
    setWeekly((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  }

  function updateException(idx: number, patch: Partial<ExceptionFormRow>) {
    setSaved(false);
    setExceptions((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await saveRestaurantHoursAction(restaurantId, {
          temporarily_closed: temporarilyClosed,
          temporarily_closed_reason: temporarilyClosed
            ? temporarilyClosedReason.trim() || null
            : null,
          weekly: weekly.map((w) => ({
            day_of_week: w.day_of_week,
            is_closed: w.is_closed,
            open_time: w.is_closed ? null : w.open_time,
            close_time: w.is_closed ? null : w.close_time,
          })),
          exceptions: exceptions.map((ex) => ({
            exception_date: ex.exception_date,
            label: ex.label.trim() || null,
            is_closed: ex.is_closed,
            open_time: ex.is_closed ? null : ex.open_time,
            close_time: ex.is_closed ? null : ex.close_time,
          })),
        });
        setSaved(true);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed");
      }
    });
  }

  const effectiveStatus = temporarilyClosed ? "temporarily_closed" : liveStatus.status;

  return (
    <form onSubmit={onSubmit} id="restaurant-hours-panel">
      <SettingsPanel
        id="restaurant-hours"
        icon={Clock}
        color="amber"
        title="Hours"
        titleId="restaurant-hours-heading"
        description="Weekly schedule, holidays, and temporary closures. The phone host won't take orders while you're closed."
        action={<Badge tone={statusTone(effectiveStatus)}>{previewLabel}</Badge>}
      >
        <div className="space-y-6">
          <Notice tone={noticeTone(effectiveStatus)}>
            {temporarilyClosed
              ? temporarilyClosedReason.trim() ||
                "Temporarily closed — the phone host will refuse new orders."
              : liveStatus.message}
            <span className="mt-0.5 block text-[12px] opacity-80">
              Local time: {liveStatus.local_date} {liveStatus.local_time} (
              {bundle.profile.timezone})
            </span>
          </Notice>

          <div className="rounded-[12px] border border-line p-3">
            <CheckRow
              checked={temporarilyClosed}
              onChange={(v) => {
                setSaved(false);
                setTemporarilyClosed(v);
              }}
              label="Temporarily closed"
              hint="Overrides weekly hours until you turn this off."
              disabled={pending}
            />
            {temporarilyClosed ? (
              <input
                className="input-base mt-2"
                value={temporarilyClosedReason}
                aria-label="Reason shown to guests"
                onChange={(e) => {
                  setSaved(false);
                  setTemporarilyClosedReason(e.target.value);
                }}
                placeholder="Reason shown to guests (optional)"
                disabled={pending}
              />
            ) : null}
          </div>

          <div>
            <SubHeading>Weekly hours</SubHeading>
            <ul className="mt-2 divide-y divide-line/70 rounded-[12px] border border-line">
              {weekly.map((row, idx) => {
                const day = DAY_LABELS[row.day_of_week];
                return (
                  <li
                    key={row.day_of_week}
                    className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-3 py-2 sm:grid-cols-[7rem_minmax(0,1fr)_auto]"
                  >
                    <span className="text-[13.5px] font-medium text-ink">{day}</span>
                    <div
                      className={
                        "col-span-2 row-start-2 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:col-span-1 sm:row-start-auto"
                      }
                    >
                      {row.is_closed ? (
                        <span className="col-span-3 text-[13px] text-subtle">Closed all day</span>
                      ) : (
                        <>
                          <input
                            type="time"
                            className="input-base tabular-nums"
                            aria-label={`${day} opens`}
                            value={row.open_time}
                            disabled={pending}
                            onChange={(e) => updateWeekly(idx, { open_time: e.target.value })}
                          />
                          <span className="text-[12.5px] text-subtle" aria-hidden>
                            to
                          </span>
                          <input
                            type="time"
                            className="input-base tabular-nums"
                            aria-label={`${day} closes`}
                            value={row.close_time}
                            disabled={pending}
                            onChange={(e) => updateWeekly(idx, { close_time: e.target.value })}
                          />
                        </>
                      )}
                    </div>
                    <label className="col-start-2 row-start-1 flex min-h-11 cursor-pointer items-center gap-2 text-[12.5px] text-muted sm:col-start-auto sm:row-start-auto lg:min-h-0">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-ink"
                        checked={row.is_closed}
                        onChange={(e) => updateWeekly(idx, { is_closed: e.target.checked })}
                        disabled={pending}
                      />
                      Closed
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            <SubHeading
              action={
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  onClick={addException}
                  disabled={pending}
                >
                  <Plus size={14} aria-hidden /> Add date
                </button>
              }
            >
              Holidays &amp; special hours
            </SubHeading>
            {exceptions.length === 0 ? (
              <p className="mt-2 rounded-[10px] border border-dashed border-line px-3 py-4 text-center text-[12.5px] text-subtle">
                No upcoming exceptions. Add holidays or special hours so the phone
                host knows when you&apos;re closed.
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {exceptions.map((ex, idx) => (
                  <li
                    key={`${ex.exception_date}-${idx}`}
                    className="space-y-2 rounded-[12px] border border-line p-3"
                  >
                    <div className="grid gap-2 sm:grid-cols-[10rem_minmax(0,1fr)_auto]">
                      <input
                        type="date"
                        className="input-base"
                        aria-label="Date"
                        value={ex.exception_date}
                        disabled={pending}
                        onChange={(e) => updateException(idx, { exception_date: e.target.value })}
                      />
                      <input
                        className="input-base"
                        value={ex.label}
                        aria-label="Label"
                        placeholder="Label (e.g. Thanksgiving)"
                        disabled={pending}
                        onChange={(e) => updateException(idx, { label: e.target.value })}
                      />
                      <button
                        type="button"
                        className="btn-ghost w-full text-danger sm:w-9 sm:px-0"
                        aria-label={`Remove ${ex.label || ex.exception_date}`}
                        disabled={pending}
                        onClick={() => {
                          setSaved(false);
                          setExceptions((prev) => prev.filter((_, i) => i !== idx));
                        }}
                      >
                        <Trash2 size={14} aria-hidden />
                        <span className="sm:sr-only">Remove</span>
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                      <label className="flex min-h-11 cursor-pointer items-center gap-2 text-[12.5px] text-muted lg:min-h-0">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-ink"
                          checked={ex.is_closed}
                          disabled={pending}
                          onChange={(e) => updateException(idx, { is_closed: e.target.checked })}
                        />
                        Closed all day
                      </label>
                      {!ex.is_closed ? (
                        <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:max-w-sm">
                          <input
                            type="time"
                            className="input-base tabular-nums"
                            aria-label="Opens"
                            value={ex.open_time}
                            disabled={pending}
                            onChange={(e) => updateException(idx, { open_time: e.target.value })}
                          />
                          <span className="text-[12.5px] text-subtle" aria-hidden>
                            to
                          </span>
                          <input
                            type="time"
                            className="input-base tabular-nums"
                            aria-label="Closes"
                            value={ex.close_time}
                            disabled={pending}
                            onChange={(e) => updateException(idx, { close_time: e.target.value })}
                          />
                        </div>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <SaveRow
          className="mt-5"
          message={
            error
              ? error
              : saved && !pending
                ? "Hours saved. Phone host prompt updated when connected."
                : null
          }
          tone={error ? "bad" : "ok"}
        >
          <button type="submit" className="btn-primary w-full sm:w-auto" disabled={pending}>
            {pending ? "Saving…" : "Save hours"}
          </button>
        </SaveRow>
      </SettingsPanel>
    </form>
  );
}
