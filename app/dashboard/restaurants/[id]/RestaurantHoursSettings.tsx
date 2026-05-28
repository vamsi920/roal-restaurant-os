"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveRestaurantHoursAction } from "./hours-actions";
import { DAY_LABELS } from "@/lib/restaurant-hours/core";
import { cn } from "@/lib/cn";
import type { RestaurantHoursBundle } from "@/lib/restaurant-hours/types";

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

function statusTone(status: string) {
  if (status === "open") return "text-success border-success/25 bg-success/5";
  if (status === "temporarily_closed") {
    return "text-warning border-warning/25 bg-warning/5";
  }
  return "text-danger border-danger/25 bg-danger/5";
}

export function RestaurantHoursSettings({ restaurantId, bundle }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
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

  return (
    <section className="glass-card overflow-hidden">
      <div className="flex w-full items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
        <div className="min-w-0 flex-1">
          <h2 id="restaurant-hours-heading" className="text-sm font-semibold text-ink">
            Hours &amp; closures
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            Weekly schedule, holidays, and temporary closure — synced to the voice agent.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-caption font-medium",
              statusTone(
                temporarilyClosed ? "temporarily_closed" : liveStatus.status
              )
            )}
          >
            {previewLabel}
          </span>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-subtle hover:bg-elev hover:text-ink"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="restaurant-hours-panel"
            aria-labelledby="restaurant-hours-heading"
          >
            <svg
              viewBox="0 0 24 24"
              className={cn("h-5 w-5 transition-transform", open && "rotate-180")}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="sr-only">{open ? "Collapse" : "Expand"} hours</span>
          </button>
        </div>
      </div>

      {open ? (
        <form
          id="restaurant-hours-panel"
          onSubmit={onSubmit}
          className="space-y-6 p-4 sm:p-5"
        >
          <p
            className={cn(
              "rounded-lg border px-3 py-2 text-sm",
              statusTone(
                temporarilyClosed ? "temporarily_closed" : liveStatus.status
              )
            )}
          >
            {temporarilyClosed
              ? temporarilyClosedReason.trim() ||
                "Temporarily closed — voice agent will refuse new orders."
              : liveStatus.message}
            <span className="mt-1 block text-xs opacity-80">
              Local: {liveStatus.local_date} {liveStatus.local_time} (
              {bundle.profile.timezone})
            </span>
          </p>

          {error ? (
            <p className="rounded-lg border border-danger/25 bg-danger/5 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          ) : null}
          {saved && !pending ? (
            <p className="rounded-lg border border-success/25 bg-success/5 px-3 py-2 text-sm text-success">
              Hours saved. Voice agent prompt updated when connected.
            </p>
          ) : null}

          <div className="rounded-xl border border-line bg-surface/40 p-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                className="mt-1"
                checked={temporarilyClosed}
                onChange={(e) => {
                  setSaved(false);
                  setTemporarilyClosed(e.target.checked);
                }}
                disabled={pending}
              />
              <span>
                <span className="text-sm font-medium text-ink">
                  Temporarily closed
                </span>
                <span className="mt-0.5 block text-xs text-muted">
                  Overrides weekly hours until you turn this off.
                </span>
              </span>
            </label>
            {temporarilyClosed ? (
              <input
                className="input-base mt-3"
                value={temporarilyClosedReason}
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
            <h3 className="text-xs font-semibold uppercase tracking-wider text-subtle">
              Weekly hours
            </h3>
            <ul className="mt-3 space-y-2">
              {weekly.map((row, idx) => (
                <li
                  key={row.day_of_week}
                  className="grid grid-cols-1 items-center gap-2 rounded-lg border border-line/80 px-3 py-2 sm:grid-cols-[120px_1fr_auto_auto]"
                >
                  <span className="text-sm font-medium text-ink">
                    {DAY_LABELS[row.day_of_week]}
                  </span>
                  <label className="flex items-center gap-2 text-xs text-muted">
                    <input
                      type="checkbox"
                      checked={row.is_closed}
                      onChange={(e) => {
                        setSaved(false);
                        setWeekly((prev) => {
                          const next = [...prev];
                          next[idx] = { ...next[idx], is_closed: e.target.checked };
                          return next;
                        });
                      }}
                      disabled={pending}
                    />
                    Closed all day
                  </label>
                  <input
                    type="time"
                    className="input-base py-1.5 text-sm"
                    value={row.open_time}
                    disabled={pending || row.is_closed}
                    onChange={(e) => {
                      setSaved(false);
                      setWeekly((prev) => {
                        const next = [...prev];
                        next[idx] = { ...next[idx], open_time: e.target.value };
                        return next;
                      });
                    }}
                  />
                  <input
                    type="time"
                    className="input-base py-1.5 text-sm"
                    value={row.close_time}
                    disabled={pending || row.is_closed}
                    onChange={(e) => {
                      setSaved(false);
                      setWeekly((prev) => {
                        const next = [...prev];
                        next[idx] = { ...next[idx], close_time: e.target.value };
                        return next;
                      });
                    }}
                  />
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-subtle">
                Holidays &amp; special hours
              </h3>
              <button
                type="button"
                className="btn-ghost text-xs"
                onClick={addException}
                disabled={pending}
              >
                Add date
              </button>
            </div>
            {exceptions.length === 0 ? (
              <p className="mt-2 text-xs text-muted">No upcoming exceptions.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {exceptions.map((ex, idx) => (
                  <li
                    key={`${ex.exception_date}-${idx}`}
                    className="space-y-2 rounded-lg border border-line/80 p-3"
                  >
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        type="date"
                        className="input-base"
                        value={ex.exception_date}
                        disabled={pending}
                        onChange={(e) => {
                          setSaved(false);
                          setExceptions((prev) => {
                            const next = [...prev];
                            next[idx] = {
                              ...next[idx],
                              exception_date: e.target.value,
                            };
                            return next;
                          });
                        }}
                      />
                      <input
                        className="input-base"
                        value={ex.label}
                        placeholder="Label (e.g. Thanksgiving)"
                        disabled={pending}
                        onChange={(e) => {
                          setSaved(false);
                          setExceptions((prev) => {
                            const next = [...prev];
                            next[idx] = { ...next[idx], label: e.target.value };
                            return next;
                          });
                        }}
                      />
                    </div>
                    <label className="flex items-center gap-2 text-xs text-muted">
                      <input
                        type="checkbox"
                        checked={ex.is_closed}
                        disabled={pending}
                        onChange={(e) => {
                          setSaved(false);
                          setExceptions((prev) => {
                            const next = [...prev];
                            next[idx] = {
                              ...next[idx],
                              is_closed: e.target.checked,
                            };
                            return next;
                          });
                        }}
                      />
                      Closed all day
                    </label>
                    {!ex.is_closed ? (
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="time"
                          className="input-base"
                          value={ex.open_time}
                          disabled={pending}
                          onChange={(e) => {
                            setSaved(false);
                            setExceptions((prev) => {
                              const next = [...prev];
                              next[idx] = {
                                ...next[idx],
                                open_time: e.target.value,
                              };
                              return next;
                            });
                          }}
                        />
                        <input
                          type="time"
                          className="input-base"
                          value={ex.close_time}
                          disabled={pending}
                          onChange={(e) => {
                            setSaved(false);
                            setExceptions((prev) => {
                              const next = [...prev];
                              next[idx] = {
                                ...next[idx],
                                close_time: e.target.value,
                              };
                              return next;
                            });
                          }}
                        />
                      </div>
                    ) : null}
                    <button
                      type="button"
                      className="text-xs text-danger hover:underline"
                      disabled={pending}
                      onClick={() => {
                        setSaved(false);
                        setExceptions((prev) =>
                          prev.filter((_, i) => i !== idx)
                        );
                      }}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex justify-end">
            <button type="submit" className="btn-primary" disabled={pending}>
              {pending ? "Saving…" : "Save hours"}
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
