"use server";

import { revalidatePath } from "next/cache";
import { requireRestaurantAccess } from "@/lib/auth/context-server";
import { applyRestaurantOrderAgentProfile } from "@/lib/elevenlabs-restaurant-agent-profile";
import {
  RestaurantHoursInputSchema,
  type RestaurantHoursInput,
} from "@/lib/restaurant-hours/schema";
import { createServerSupabase } from "@/lib/supabase/server";

export async function saveRestaurantHoursAction(
  restaurantId: string,
  raw: RestaurantHoursInput
) {
  const access = await requireRestaurantAccess(restaurantId);
  if (access.errorResponse) {
    const status = access.errorResponse.status;
    if (status === 401) throw new Error("Sign in to save hours.");
    if (status === 404) throw new Error("Restaurant not found.");
    throw new Error("You do not have access to this restaurant.");
  }

  const parsed = RestaurantHoursInputSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Invalid hours data";
    throw new Error(msg);
  }

  const supabase = await createServerSupabase();
  const input = parsed.data;

  const { error: profileErr } = await supabase
    .from("restaurant_profiles")
    .update({
      temporarily_closed: input.temporarily_closed,
      temporarily_closed_reason: input.temporarily_closed_reason,
      updated_at: new Date().toISOString(),
    })
    .eq("restaurant_id", restaurantId);

  if (profileErr) throw new Error(profileErr.message);

  for (const row of input.weekly) {
    const { error } = await supabase.from("restaurant_weekly_hours").upsert(
      {
        restaurant_id: restaurantId,
        day_of_week: row.day_of_week,
        is_closed: row.is_closed,
        open_time: row.is_closed ? null : row.open_time,
        close_time: row.is_closed ? null : row.close_time,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "restaurant_id,day_of_week" }
    );
    if (error) throw new Error(error.message);
  }

  const { data: existing } = await supabase
    .from("restaurant_hours_exceptions")
    .select("id, exception_date")
    .eq("restaurant_id", restaurantId);

  const keepDates = new Set(input.exceptions.map((e) => e.exception_date));
  for (const row of existing ?? []) {
    if (!keepDates.has(String(row.exception_date).slice(0, 10))) {
      const { error } = await supabase
        .from("restaurant_hours_exceptions")
        .delete()
        .eq("id", row.id);
      if (error) throw new Error(error.message);
    }
  }

  for (const ex of input.exceptions) {
    const { error } = await supabase.from("restaurant_hours_exceptions").upsert(
      {
        restaurant_id: restaurantId,
        exception_date: ex.exception_date,
        label: ex.label ?? null,
        is_closed: ex.is_closed,
        open_time: ex.is_closed ? null : ex.open_time,
        close_time: ex.is_closed ? null : ex.close_time,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "restaurant_id,exception_date" }
    );
    if (error) throw new Error(error.message);
  }

  revalidatePath(`/dashboard/restaurants/${restaurantId}`);

  try {
    await applyRestaurantOrderAgentProfile({
      restaurantId,
      restaurantName: access.access.restaurant.name,
    });
  } catch {
    // Agent sync is best-effort; hours are saved regardless.
  }

  return { ok: true as const };
}
