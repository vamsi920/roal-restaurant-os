/** Edge copy of lib/restaurant-hours/core.ts — keep in sync. */

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

function getZonedParts(date: Date, timeZone: string) {
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
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const hour = Number(get("hour"));
  const minute = Number(get("minute"));
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
    dayOfWeek: map[get("weekday")] ?? 0,
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
  let sourceLabel = DAY_LABELS[zoned.dayOfWeek] ?? "today";

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

function sliceTime(v: unknown): string | null {
  if (v == null) return null;
  return String(v).slice(0, 5);
}

export async function loadHoursForRestaurant(
  supabase: { from: (table: string) => unknown },
  restaurantId: string
) {
  const client = supabase as {
    from: (table: string) => {
      select: (cols: string) => {
        eq: (col: string, val: string) => {
          maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>;
          order: (col: string, opts: { ascending: boolean }) => Promise<{ data: Record<string, unknown>[] | null; error: { message: string } | null }>;
          gte: (col: string, val: string) => {
            lte: (col2: string, val2: string) => {
              order: (col3: string, opts: { ascending: boolean }) => Promise<{ data: Record<string, unknown>[] | null; error: { message: string } | null }>;
            };
          };
        };
      };
    };
  };

  const { data: profile, error: pErr } = await client
    .from("restaurant_profiles")
    .select("timezone, temporarily_closed, temporarily_closed_reason")
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (pErr) throw new Error(pErr.message);

  const { data: weekly, error: wErr } = await client
    .from("restaurant_weekly_hours")
    .select("day_of_week, is_closed, open_time, close_time")
    .eq("restaurant_id", restaurantId)
    .order("day_of_week", { ascending: true });

  if (wErr) throw new Error(wErr.message);

  const today = new Date().toISOString().slice(0, 10);
  const horizon = new Date();
  horizon.setUTCDate(horizon.getUTCDate() + 90);
  const horizonStr = horizon.toISOString().slice(0, 10);

  const { data: exceptions, error: eErr } = await client
    .from("restaurant_hours_exceptions")
    .select("exception_date, label, is_closed, open_time, close_time")
    .eq("restaurant_id", restaurantId)
    .gte("exception_date", today)
    .lte("exception_date", horizonStr)
    .order("exception_date", { ascending: true });

  if (eErr) throw new Error(eErr.message);

  const profileInput: HoursProfileInput = {
    timezone: String(profile?.timezone ?? "America/Chicago"),
    temporarily_closed: Boolean(profile?.temporarily_closed),
    temporarily_closed_reason:
      profile?.temporarily_closed_reason != null
        ? String(profile.temporarily_closed_reason)
        : null,
  };

  const weeklyInput: WeeklyHourInput[] = (weekly ?? []).map((row) => ({
    day_of_week: Number(row.day_of_week),
    is_closed: Boolean(row.is_closed),
    open_time: sliceTime(row.open_time),
    close_time: sliceTime(row.close_time),
  }));

  const exceptionInput: HoursExceptionInput[] = (exceptions ?? []).map((row) => ({
    exception_date: String(row.exception_date).slice(0, 10),
    label: row.label != null ? String(row.label) : null,
    is_closed: Boolean(row.is_closed),
    open_time: sliceTime(row.open_time),
    close_time: sliceTime(row.close_time),
  }));

  const evaluation = evaluateRestaurantHours({
    profile: profileInput,
    weekly: weeklyInput,
    exceptions: exceptionInput,
  });

  return { profile: profileInput, weekly: weeklyInput, exceptions: exceptionInput, evaluation };
}
