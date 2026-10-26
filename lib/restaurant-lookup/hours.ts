import type { WeeklyHourInput } from "@/lib/restaurant-hours/core";

export type PlacesPeriodClock = {
  day?: number;
  hour?: number;
  minute?: number;
};

export type PlacesOpeningPeriod = {
  open?: PlacesPeriodClock;
  close?: PlacesPeriodClock;
};

function padTime(hour: number, minute: number): string {
  const h = Math.min(23, Math.max(0, hour));
  const m = Math.min(59, Math.max(0, minute));
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function clockToTime(clock: PlacesPeriodClock | undefined): string | null {
  if (!clock || typeof clock.hour !== "number") return null;
  return padTime(clock.hour, clock.minute ?? 0);
}

/** Map Places regularOpeningHours.periods onto 7 weekly rows. Closed days included. */
export function weeklyHoursFromPlacesPeriods(
  periods: PlacesOpeningPeriod[] | null | undefined
): WeeklyHourInput[] | null {
  if (!periods || periods.length === 0) return null;

  const openByDay = new Map<number, { open_time: string; close_time: string }>();

  for (const period of periods) {
    const day = period.open?.day;
    if (typeof day !== "number" || day < 0 || day > 6) continue;
    const open_time = clockToTime(period.open);
    const close_time = clockToTime(period.close) ?? clockToTime(period.open);
    if (!open_time || !close_time) continue;
    if (open_time === close_time) continue;
    if (!openByDay.has(day)) {
      openByDay.set(day, { open_time, close_time });
    }
  }

  if (openByDay.size === 0) return null;

  return Array.from({ length: 7 }, (_, day_of_week) => {
    const row = openByDay.get(day_of_week);
    if (!row) {
      return {
        day_of_week,
        is_closed: true,
        open_time: null,
        close_time: null,
      };
    }
    return {
      day_of_week,
      is_closed: false,
      open_time: row.open_time,
      close_time: row.close_time,
    };
  });
}
