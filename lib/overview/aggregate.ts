/**
 * Pure aggregation for the per-location Overview home. No I/O here so every
 * number on the page is unit-testable (see tests/unit/overview-aggregate.test.ts).
 */
import type {
  OverviewActivityItem,
  OverviewDayPoint,
} from "@/lib/overview/types";

export const OVERVIEW_SERIES_DAYS = 14;
export const OVERVIEW_ACTIVITY_LIMIT = 8;

/* ------------------------------------------------------------------ */
/* Time zones                                                          */
/* ------------------------------------------------------------------ */

export function safeTimeZone(tz: string | null | undefined): string {
  const candidate = tz?.trim();
  if (!candidate) return "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: candidate }).format(new Date(0));
    return candidate;
  } catch {
    return "UTC";
  }
}

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

export function zonedParts(date: Date, timeZone: string): ZonedParts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: safeTimeZone(timeZone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const out: Record<string, number> = {};
  for (const part of fmt.formatToParts(date)) {
    if (part.type !== "literal") out[part.type] = Number(part.value);
  }
  return {
    year: out.year,
    month: out.month,
    day: out.day,
    hour: (out.hour ?? 0) % 24,
    minute: out.minute ?? 0,
    second: out.second ?? 0,
  };
}

function tzOffsetMs(date: Date, timeZone: string): number {
  const p = zonedParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  const wholeSeconds = Math.floor(date.getTime() / 1000) * 1000;
  return asUtc - wholeSeconds;
}

/** UTC instant of local midnight on y-m-d in `timeZone` (DST safe). */
export function zonedMidnightUtc(
  year: number,
  month: number,
  day: number,
  timeZone: string
): Date {
  const guess = Date.UTC(year, month - 1, day);
  const offset = tzOffsetMs(new Date(guess), timeZone);
  let t = guess - offset;
  const offset2 = tzOffsetMs(new Date(t), timeZone);
  if (offset2 !== offset) t = guess - offset2;
  return new Date(t);
}

/** Start of the current calendar month in the restaurant's timezone. */
export function monthStartUtc(now: Date, timeZone: string): Date {
  const p = zonedParts(now, timeZone);
  return zonedMidnightUtc(p.year, p.month, 1, timeZone);
}

/** YYYY-MM-DD of an instant in `timeZone`. */
export function zonedDayKey(iso: string | Date, timeZone: string): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  const p = zonedParts(date, timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** The last `days` local day keys, oldest first, ending today. */
export function lastDayKeys(now: Date, timeZone: string, days = OVERVIEW_SERIES_DAYS): string[] {
  const p = zonedParts(now, timeZone);
  const keys: string[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    keys.push(new Date(Date.UTC(p.year, p.month - 1, p.day - i)).toISOString().slice(0, 10));
  }
  return keys;
}

/** UTC instant of local midnight at the first day of the chart window. */
export function seriesStartUtc(now: Date, timeZone: string, days = OVERVIEW_SERIES_DAYS): Date {
  const first = lastDayKeys(now, timeZone, days)[0];
  const [y, m, d] = first.split("-").map(Number);
  return zonedMidnightUtc(y, m, d, timeZone);
}

/** "Friday 4:11 PM" in the restaurant's timezone. */
export function formatLocalDayTime(now: Date, timeZone: string): string {
  const tz = safeTimeZone(timeZone);
  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: tz }).format(now);
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: tz,
  }).format(now);
  return `${weekday} ${time}`;
}

export function formatMonthLabel(now: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    timeZone: safeTimeZone(timeZone),
  }).format(now);
}

/* ------------------------------------------------------------------ */
/* Counting                                                            */
/* ------------------------------------------------------------------ */

export function isWithin(iso: string | null | undefined, since: Date, until?: Date): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  if (t < since.getTime()) return false;
  if (until && t > until.getTime()) return false;
  return true;
}

export function buildDailySeries(input: {
  dayKeys: string[];
  timeZone: string;
  callStartedAt: string[];
  orderCreatedAt: string[];
}): OverviewDayPoint[] {
  const calls = new Map<string, number>();
  const orders = new Map<string, number>();
  for (const iso of input.callStartedAt) {
    const key = zonedDayKey(iso, input.timeZone);
    calls.set(key, (calls.get(key) ?? 0) + 1);
  }
  for (const iso of input.orderCreatedAt) {
    const key = zonedDayKey(iso, input.timeZone);
    orders.set(key, (orders.get(key) ?? 0) + 1);
  }
  return input.dayKeys.map((date) => ({
    date,
    calls: calls.get(date) ?? 0,
    orders: orders.get(date) ?? 0,
  }));
}

/** Seconds from `transcript_metadata.call_duration_secs` (number or numeric string). */
export function callDurationSeconds(metadata: Record<string, unknown> | null | undefined): number {
  const raw = metadata?.call_duration_secs;
  const n = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw.trim()) : NaN;
  if (!Number.isFinite(n) || n <= 0) return 0;
  // Ignore obviously broken values (> 6 hours on one call).
  if (n > 6 * 60 * 60) return 0;
  return Math.round(n);
}

export function sumCallDurationSeconds(
  events: Array<{ transcript_metadata?: Record<string, unknown> | null }>
): number {
  return events.reduce((sum, e) => sum + callDurationSeconds(e.transcript_metadata), 0);
}

/** "0 min", "45 min", "3 hr 20 min", "12 hr". */
export function formatHandledDuration(totalSeconds: number): string {
  const minutes = Math.round(Math.max(0, totalSeconds) / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours >= 10 || rest === 0) return `${hours} hr`;
  return `${hours} hr ${rest} min`;
}

/* ------------------------------------------------------------------ */
/* People                                                              */
/* ------------------------------------------------------------------ */

/** "(512) •••-7437" for US numbers, "•••7437" otherwise, "Unknown caller" when empty. */
export function maskCallerPhone(raw: string | null | undefined): string {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (digits.length < 4) return "Unknown caller";
  const national = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (national.length === 10) {
    return `(${national.slice(0, 3)}) •••-${national.slice(6)}`;
  }
  return `•••${digits.slice(-4)}`;
}

function capitalize(word: string): string {
  return word ? word[0].toUpperCase() + word.slice(1).toLowerCase() : word;
}

/** First name for the greeting: profile/full name first, else the email local part. */
export function firstNameFor(input: {
  fullName?: string | null;
  email?: string | null;
}): string | null {
  const full = input.fullName?.trim();
  if (full && !full.includes("@")) {
    const first = full.split(/\s+/)[0];
    if (first) return capitalize(first);
  }
  const email = (input.email ?? full ?? "").trim();
  const local = email.split("@")[0] ?? "";
  const token = local.split(/[._+\-\d]+/).find((part) => part.length >= 2);
  if (!token) return null;
  return capitalize(token);
}

/* ------------------------------------------------------------------ */
/* Recent activity                                                     */
/* ------------------------------------------------------------------ */

export type OverviewActivitySource = {
  sessionId: string;
  callerPhone: string | null;
  callerName: string | null;
  status: string;
  outcome: string;
  intentLabel: string;
  totalLabel: string | null;
  needsStaffFollowUp: boolean;
  followUpReason: string | null;
  occurredAt: string;
  isTestHarness?: boolean;
};

export function classifyActivity(row: OverviewActivitySource): OverviewActivityItem["kind"] {
  if (row.status === "active") return "live";
  if (row.needsStaffFollowUp) return "followup";
  if (row.outcome === "order_completed") return "order";
  return "call";
}

const KIND_RANK: Record<OverviewActivityItem["kind"], number> = {
  live: 0,
  followup: 1,
  order: 2,
  call: 2,
};

export function buildActivityItems(
  rows: OverviewActivitySource[],
  limit = OVERVIEW_ACTIVITY_LIMIT
): OverviewActivityItem[] {
  const items = rows
    .filter((row) => !row.isTestHarness)
    .map<OverviewActivityItem>((row) => {
      const kind = classifyActivity(row);
      const subtitle =
        row.callerName?.trim() ||
        (kind === "live" ? "On the line now" : kind === "call" ? "Recent caller" : row.intentLabel);
      return {
        id: row.sessionId,
        kind,
        title: maskCallerPhone(row.callerPhone),
        subtitle,
        amountLabel: kind === "order" ? row.totalLabel : null,
        reason: kind === "followup" ? row.followUpReason : null,
        occurredAt: row.occurredAt,
      };
    });

  items.sort((a, b) => {
    // Live calls pin to the top; everything else is newest first.
    const live = Number(b.kind === "live") - Number(a.kind === "live");
    if (live !== 0) return live;
    const t = new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime();
    if (t !== 0) return t;
    return KIND_RANK[a.kind] - KIND_RANK[b.kind];
  });

  return items.slice(0, limit);
}

/* ------------------------------------------------------------------ */
/* Chart geometry                                                      */
/* ------------------------------------------------------------------ */

/** Round the axis max up to a friendly number (1, 2, 5, 10, 20, 50…). */
export function niceAxisMax(value: number): number {
  if (value <= 4) return 4;
  const exp = Math.pow(10, Math.floor(Math.log10(value)));
  for (const step of [1, 2, 2.5, 5, 10]) {
    const candidate = step * exp;
    if (candidate >= value) return Math.ceil(candidate);
  }
  return Math.ceil(10 * exp);
}

export function chartPoints(
  values: number[],
  box: { width: number; height: number; max: number }
): Array<[number, number]> {
  if (values.length === 0) return [];
  const stepX = values.length > 1 ? box.width / (values.length - 1) : 0;
  const max = box.max > 0 ? box.max : 1;
  return values.map((v, i) => [
    Math.round(i * stepX * 10) / 10,
    Math.round((box.height - (Math.max(0, v) / max) * box.height) * 10) / 10,
  ]);
}

export function linePath(points: Array<[number, number]>): string {
  return points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x} ${y}`).join(" ");
}

export function areaPath(points: Array<[number, number]>, baseline: number): string {
  if (points.length === 0) return "";
  const first = points[0];
  const last = points[points.length - 1];
  return `${linePath(points)} L${last[0]} ${baseline} L${first[0]} ${baseline} Z`;
}
