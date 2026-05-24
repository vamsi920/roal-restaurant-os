import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildHoursPromptSection,
  DAY_LABELS,
  evaluateRestaurantHours,
  type HoursExceptionInput,
  type WeeklyHourInput,
} from "@/lib/restaurant-hours/core";
import type {
  RestaurantHoursBundle,
  RestaurantHoursException,
  RestaurantWeeklyHour,
} from "@/lib/restaurant-hours/types";
function mapWeekly(row: Record<string, unknown>): RestaurantWeeklyHour {
  return {
    id: String(row.id),
    restaurant_id: String(row.restaurant_id),
    day_of_week: Number(row.day_of_week),
    is_closed: Boolean(row.is_closed),
    open_time: row.open_time != null ? String(row.open_time).slice(0, 5) : null,
    close_time: row.close_time != null ? String(row.close_time).slice(0, 5) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function mapException(row: Record<string, unknown>): RestaurantHoursException {
  return {
    id: String(row.id),
    restaurant_id: String(row.restaurant_id),
    exception_date: String(row.exception_date).slice(0, 10),
    label: row.label != null ? String(row.label) : null,
    is_closed: Boolean(row.is_closed),
    open_time: row.open_time != null ? String(row.open_time).slice(0, 5) : null,
    close_time: row.close_time != null ? String(row.close_time).slice(0, 5) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function loadRestaurantHoursBundle(
  supabase: SupabaseClient,
  restaurantId: string
): Promise<RestaurantHoursBundle | null> {
  const { data: profile, error: pErr } = await supabase
    .from("restaurant_profiles")
    .select(
      "restaurant_id, organization_id, timezone, temporarily_closed, temporarily_closed_reason"
    )
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (pErr) throw new Error(pErr.message);
  if (!profile) return null;

  const { data: weekly, error: wErr } = await supabase
    .from("restaurant_weekly_hours")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("day_of_week", { ascending: true });

  if (wErr) throw new Error(wErr.message);

  const { data: exceptions, error: eErr } = await supabase
    .from("restaurant_hours_exceptions")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("exception_date", { ascending: true });

  if (eErr) throw new Error(eErr.message);

  const weeklyRows = (weekly ?? []).map((r) =>
    mapWeekly(r as Record<string, unknown>)
  );
  const exceptionRows = (exceptions ?? []).map((r) =>
    mapException(r as Record<string, unknown>)
  );

  const profileInput = {
    timezone: String(profile.timezone ?? "America/Chicago"),
    temporarily_closed: Boolean(profile.temporarily_closed),
    temporarily_closed_reason:
      profile.temporarily_closed_reason != null
        ? String(profile.temporarily_closed_reason)
        : null,
  };

  const weeklyInput: WeeklyHourInput[] = DAY_LABELS.map((_, dow) => {
    const row = weeklyRows.find((w) => w.day_of_week === dow);
    return {
      day_of_week: dow,
      is_closed: row?.is_closed ?? false,
      open_time: row?.is_closed ? null : row?.open_time ?? "11:00",
      close_time: row?.is_closed ? null : row?.close_time ?? "21:00",
    };
  });

  const exceptionInput: HoursExceptionInput[] = exceptionRows.map((e) => ({
    exception_date: e.exception_date,
    label: e.label,
    is_closed: e.is_closed,
    open_time: e.open_time,
    close_time: e.close_time,
  }));

  const evaluation = evaluateRestaurantHours({
    profile: profileInput,
    weekly: weeklyInput,
    exceptions: exceptionInput,
  });

  return {
    profile: profileInput,
    weekly: weeklyRows,
    exceptions: exceptionRows,
    evaluation,
  };
}

export async function evaluateRestaurantOrdering(
  supabase: SupabaseClient,
  restaurantId: string
) {
  const bundle = await loadRestaurantHoursBundle(supabase, restaurantId);
  if (!bundle) {
    return {
      ordering_allowed: true,
      is_open_now: true,
      status: "open" as const,
      message: "Hours not configured.",
    };
  }
  return bundle.evaluation;
}

export function buildAgentHoursPromptFromBundle(bundle: RestaurantHoursBundle): string {
  return buildHoursPromptSection({
    profile: bundle.profile,
    weekly: bundle.weekly.map((w) => ({
      day_of_week: w.day_of_week,
      is_closed: w.is_closed,
      open_time: w.open_time,
      close_time: w.close_time,
    })),
    exceptions: bundle.exceptions.map((e) => ({
      exception_date: e.exception_date,
      label: e.label,
      is_closed: e.is_closed,
      open_time: e.open_time,
      close_time: e.close_time,
    })),
    evaluation: bundle.evaluation,
  });
}

export function operationsPayloadFromBundle(bundle: RestaurantHoursBundle) {
  return {
    timezone: bundle.profile.timezone,
    temporarily_closed: bundle.profile.temporarily_closed,
    temporarily_closed_reason: bundle.profile.temporarily_closed_reason,
    ordering_allowed: bundle.evaluation.ordering_allowed,
    is_open_now: bundle.evaluation.is_open_now,
    status: bundle.evaluation.status,
    message: bundle.evaluation.message,
    local_date: bundle.evaluation.local_date,
    local_time: bundle.evaluation.local_time,
    weekly_hours: bundle.weekly,
    upcoming_exceptions: bundle.exceptions,
  };
}
