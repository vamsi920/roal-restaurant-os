import type { AnalyticsRangeKey } from "@/lib/analytics/types";
import { DEFAULT_RESTAURANT_TIMEZONE } from "@/lib/restaurant-profile/timezone";

const RANGE_DAYS: Record<AnalyticsRangeKey, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

export function parseAnalyticsRangeKey(
  raw: string | string[] | undefined
): AnalyticsRangeKey {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === "7d" || value === "30d" || value === "90d") return value;
  return "30d";
}

export function analyticsRangeBounds(key: AnalyticsRangeKey): {
  since: Date;
  until: Date;
  days: number;
} {
  const days = RANGE_DAYS[key];
  const until = new Date();
  const since = new Date(until.getTime() - days * 24 * 60 * 60 * 1000);
  return { since, until, days };
}

export function dayKeyUtc(iso: string): string {
  return iso.slice(0, 10);
}

export const HOUR_LABELS = [
  "12 AM",
  "1 AM",
  "2 AM",
  "3 AM",
  "4 AM",
  "5 AM",
  "6 AM",
  "7 AM",
  "8 AM",
  "9 AM",
  "10 AM",
  "11 AM",
  "12 PM",
  "1 PM",
  "2 PM",
  "3 PM",
  "4 PM",
  "5 PM",
  "6 PM",
  "7 PM",
  "8 PM",
  "9 PM",
  "10 PM",
  "11 PM",
];

export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/** "7 PM" style label for an hour of the day (0-23). */
export function hourLabel(hour: number): string {
  return HOUR_LABELS[hour] ?? `${hour}:00`;
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function safeZone(timeZone: string | null | undefined): string {
  const zone = timeZone?.trim();
  if (!zone) return DEFAULT_RESTAURANT_TIMEZONE;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return zone;
  } catch {
    return DEFAULT_RESTAURANT_TIMEZONE;
  }
}

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = formatterCache.get(timeZone);
  if (cached) return cached;
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  });
  formatterCache.set(timeZone, formatter);
  return formatter;
}

export type LocalTimeParts = {
  /** YYYY-MM-DD in the given zone. */
  dayKey: string;
  /** 0 = Sunday … 6 = Saturday, in the given zone. */
  dayOfWeek: number;
  /** 0-23 in the given zone. */
  hour: number;
};

/** Calendar day, weekday and hour of an instant as seen in `timeZone` (an IANA zone). */
export function localTimeParts(
  iso: string | Date,
  timeZone: string | null | undefined
): LocalTimeParts | null {
  const date = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const parts = partsFormatter(safeZone(timeZone)).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  const hour = Number(get("hour")) % 24;
  const dayOfWeek = WEEKDAY_INDEX[get("weekday")];
  if (!Number.isFinite(hour) || dayOfWeek == null) return null;
  return {
    dayKey: `${get("year")}-${get("month")}-${get("day")}`,
    dayOfWeek,
    hour,
  };
}

/** YYYY-MM-DD of an instant in `timeZone`; UTC slice when no zone is given. */
export function dayKeyInZone(iso: string, timeZone?: string | null): string {
  if (!timeZone) return dayKeyUtc(iso);
  return localTimeParts(iso, timeZone)?.dayKey ?? dayKeyUtc(iso);
}

/** Every calendar day from `since` to `until`, in `timeZone` (UTC when omitted). */
export function buildDaySeries(
  since: Date,
  until: Date,
  timeZone?: string | null
): string[] {
  const startKey = timeZone
    ? dayKeyInZone(since.toISOString(), timeZone)
    : since.toISOString().slice(0, 10);
  const endKey = timeZone
    ? dayKeyInZone(until.toISOString(), timeZone)
    : until.toISOString().slice(0, 10);
  const keys: string[] = [];
  const cursor = new Date(`${startKey}T00:00:00.000Z`);
  const end = new Date(`${endKey}T00:00:00.000Z`);
  while (cursor <= end) {
    keys.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return keys;
}
