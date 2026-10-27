import type { Db } from "@/lib/db";
import {
  evaluateRestaurantHours,
  type HoursExceptionInput,
  type HoursProfileInput,
  type WeeklyHourInput,
} from "@/lib/restaurant-hours/core";

/**
 * Hours snapshot for agent tools: weekly hours + exceptions in the next 90 days,
 * evaluated with the shared lib/restaurant-hours/core logic.
 */
function sliceTime(v: unknown): string | null {
  if (v == null) return null;
  return String(v).slice(0, 5);
}

export async function loadHoursForRestaurant(
  db: Db,
  restaurantId: string
) {
  const { data: profile, error: pErr } = await db
    .from("restaurant_profiles")
    .select("timezone, temporarily_closed, temporarily_closed_reason")
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (pErr) throw new Error(pErr.message);

  const { data: weekly, error: wErr } = await db
    .from("restaurant_weekly_hours")
    .select("day_of_week, is_closed, open_time, close_time")
    .eq("restaurant_id", restaurantId)
    .order("day_of_week", { ascending: true });

  if (wErr) throw new Error(wErr.message);

  const today = new Date().toISOString().slice(0, 10);
  const horizon = new Date();
  horizon.setUTCDate(horizon.getUTCDate() + 90);
  const horizonStr = horizon.toISOString().slice(0, 10);

  const { data: exceptions, error: eErr } = await db
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
