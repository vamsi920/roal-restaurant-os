/** Pure hours logic (no framework imports) — safe for Edge copy. */

export const DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export type WeeklyHourInput = {
  day_of_week: number;
  is_closed: boolean;
  open_time: string | null;
  close_time: string | null;
};

export type HoursExceptionInput = {
  exception_date: string;
  label: string | null;
  is_closed: boolean;
  open_time: string | null;
  close_time: string | null;
};

export type HoursProfileInput = {
  timezone: string;
  temporarily_closed: boolean;
  temporarily_closed_reason: string | null;
};

export type RestaurantHoursEvaluation = {
  ordering_allowed: boolean;
  is_open_now: boolean;
  status: "open" | "closed" | "temporarily_closed";
  message: string;
  local_date: string;
  local_time: string;
  local_day_of_week: number;
  next_open_hint: string | null;
};

function parseTimeToMinutes(value: string | null): number | null {
  if (!value) return null;
  const m = value.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

function formatMinutes(m: number): string {
  const h = Math.floor(m / 60) % 24;
  const min = m % 60;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(min).padStart(2, "0")} ${suffix}`;
}

function getZonedParts(date: Date, timeZone: string): {
  date: string;
  time: string;
  dayOfWeek: number;
  minutes: number;
} {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  });
  const parts = fmt.formatToParts(date);
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "";

  const year = get("year");
  const month = get("month");
  const day = get("day");
  const hour = Number(get("hour"));
  const minute = Number(get("minute"));
  const weekday = get("weekday");

  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    date: `${year}-${month}-${day}`,
    time: `${get("hour")}:${get("minute")}`,
    dayOfWeek: map[weekday] ?? 0,
    minutes: hour * 60 + minute,
  };
}

function isWithinWindow(
  nowMinutes: number,
  openMinutes: number,
  closeMinutes: number
): boolean {
  if (openMinutes === closeMinutes) return false;
  if (closeMinutes > openMinutes) {
    return nowMinutes >= openMinutes && nowMinutes < closeMinutes;
  }
  return nowMinutes >= openMinutes || nowMinutes < closeMinutes;
}

function windowLabel(open: string | null, close: string | null): string {
  const o = parseTimeToMinutes(open);
  const c = parseTimeToMinutes(close);
  if (o == null || c == null) return "closed";
  return `${formatMinutes(o)} – ${formatMinutes(c)}`;
}

export function evaluateRestaurantHours(input: {
  profile: HoursProfileInput;
  weekly: WeeklyHourInput[];
  exceptions: HoursExceptionInput[];
  at?: Date;
}): RestaurantHoursEvaluation {
  const at = input.at ?? new Date();
  const tz = input.profile.timezone?.trim() || "America/Chicago";
  const zoned = getZonedParts(at, tz);

  if (input.profile.temporarily_closed) {
    const reason = input.profile.temporarily_closed_reason?.trim();
    return {
      ordering_allowed: false,
      is_open_now: false,
      status: "temporarily_closed",
      message: reason
        ? `We are temporarily closed: ${reason}`
        : "We are temporarily closed and cannot take phone orders right now.",
      local_date: zoned.date,
      local_time: zoned.time,
      local_day_of_week: zoned.dayOfWeek,
      next_open_hint: null,
    };
  }

  const exception = input.exceptions.find((e) => e.exception_date === zoned.date);
  let isClosed = false;
  let openTime: string | null = null;
  let closeTime: string | null = null;
  let sourceLabel: string = DAY_LABELS[zoned.dayOfWeek] ?? "today";

  if (exception) {
    sourceLabel = exception.label?.trim() || `special hours (${zoned.date})`;
    isClosed = exception.is_closed;
    openTime = exception.open_time;
    closeTime = exception.close_time;
  } else {
    const weekly =
      input.weekly.find((w) => w.day_of_week === zoned.dayOfWeek) ?? null;
    if (!weekly || weekly.is_closed) {
      isClosed = true;
    } else {
      openTime = weekly.open_time;
      closeTime = weekly.close_time;
    }
  }

  if (isClosed) {
    return {
      ordering_allowed: false,
      is_open_now: false,
      status: "closed",
      message: `We are closed for ${sourceLabel} and cannot take orders right now.`,
      local_date: zoned.date,
      local_time: zoned.time,
      local_day_of_week: zoned.dayOfWeek,
      next_open_hint: null,
    };
  }

  const openMin = parseTimeToMinutes(openTime);
  const closeMin = parseTimeToMinutes(closeTime);

  if (openMin == null || closeMin == null) {
    return {
      ordering_allowed: false,
      is_open_now: false,
      status: "closed",
      message: "Hours are not configured for today.",
      local_date: zoned.date,
      local_time: zoned.time,
      local_day_of_week: zoned.dayOfWeek,
      next_open_hint: null,
    };
  }

  const openNow = isWithinWindow(zoned.minutes, openMin, closeMin);

  if (!openNow) {
    return {
      ordering_allowed: false,
      is_open_now: false,
      status: "closed",
      message: `We are currently closed. Today's hours are ${windowLabel(openTime, closeTime)} (${tz}).`,
      local_date: zoned.date,
      local_time: zoned.time,
      local_day_of_week: zoned.dayOfWeek,
      next_open_hint: windowLabel(openTime, closeTime),
    };
  }

  return {
    ordering_allowed: true,
    is_open_now: true,
    status: "open",
    message: `We are open until ${formatMinutes(closeMin)} (${tz}).`,
    local_date: zoned.date,
    local_time: zoned.time,
    local_day_of_week: zoned.dayOfWeek,
    next_open_hint: null,
  };
}

export function formatWeeklyHoursForPrompt(weekly: WeeklyHourInput[]): string {
  const lines = DAY_LABELS.map((label, dow) => {
    const row = weekly.find((w) => w.day_of_week === dow);
    if (!row || row.is_closed) return `- ${label}: closed`;
    return `- ${label}: ${windowLabel(row.open_time, row.close_time)}`;
  });
  return lines.join("\n");
}

export function formatExceptionsForPrompt(
  exceptions: HoursExceptionInput[],
  options?: { fromDate?: string }
): string {
  const fromDate =
    options?.fromDate ?? new Date().toISOString().slice(0, 10);
  const upcoming = exceptions.filter((e) => e.exception_date >= fromDate);
  if (upcoming.length === 0) return "- None scheduled.";
  return upcoming
    .slice()
    .sort((a, b) => a.exception_date.localeCompare(b.exception_date))
    .map((e) => {
      if (e.is_closed) {
        return `- ${e.exception_date}${e.label ? ` (${e.label})` : ""}: closed`;
      }
      return `- ${e.exception_date}${e.label ? ` (${e.label})` : ""}: ${windowLabel(e.open_time, e.close_time)}`;
    })
    .join("\n");
}

export function buildHoursPromptSection(input: {
  profile: HoursProfileInput;
  weekly: WeeklyHourInput[];
  exceptions: HoursExceptionInput[];
  evaluation: RestaurantHoursEvaluation;
}): string {
  return `
## Hours and ordering availability (snapshot from last agent sync)
Timezone: ${input.profile.timezone}
Temporarily closed flag: ${input.profile.temporarily_closed ? "yes" : "no"}
Current local time: ${input.evaluation.local_date} ${input.evaluation.local_time} (${DAY_LABELS[input.evaluation.local_day_of_week]})
Ordering allowed now: ${input.evaluation.ordering_allowed ? "yes" : "no"}
Status: ${input.evaluation.status}
Guest-facing summary: ${input.evaluation.message}

Weekly hours:
${formatWeeklyHoursForPrompt(input.weekly)}

Upcoming exceptions / holidays:
${formatExceptionsForPrompt(input.exceptions, { fromDate: input.evaluation.local_date })}

If ordering_allowed is no: politely refuse to take the order unless get_menu_items operations.ordering_allowed is yes—in that case follow the live menu operations block.
Do not call sync_draft_order or finalize_order when ordering is not allowed.
If ordering_allowed is yes but get_menu_items operations.ordering_allowed is no: refuse and use operations.message.
If both allow ordering: proceed with normal ordering flow.
Quote open/close times only from the weekly hours and exceptions above—do not guess holiday hours.
`.trim();
}
