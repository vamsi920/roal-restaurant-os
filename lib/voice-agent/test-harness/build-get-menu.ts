import type { SupabaseClient } from "@supabase/supabase-js";
import { loadRestaurantMenu } from "@/lib/menu-editor/load-menu";
import { loadRestaurantHoursBundle } from "@/lib/restaurant-hours/helpers";
import { evaluateRestaurantHours } from "@/lib/restaurant-hours/core";
import {
  getRestaurantProfile,
  serviceModesFromProfile,
} from "@/lib/restaurant-profile/helpers";

export async function buildGetMenuHarnessResponse(
  supabase: SupabaseClient,
  restaurantId: string,
  restaurantNameHint?: string | null
): Promise<{ body: Record<string, unknown>; httpStatus: number }> {
  const { data: restaurant, error: rErr } = await supabase
    .from("restaurants")
    .select("id, name, created_at")
    .eq("id", restaurantId)
    .maybeSingle();

  if (rErr) {
    return { httpStatus: 500, body: { error: rErr.message } };
  }
  if (!restaurant) {
    return { httpStatus: 404, body: { error: "Restaurant not found" } };
  }

  let operations: Record<string, unknown> = {
    ordering_allowed: true,
    is_open_now: true,
    status: "open",
    message: "Hours not configured.",
  };

  try {
    const hoursBundle = await loadRestaurantHoursBundle(supabase, restaurantId);
    if (hoursBundle) {
      const evaluation = evaluateRestaurantHours({
        profile: hoursBundle.profile,
        weekly: hoursBundle.weekly,
        exceptions: hoursBundle.exceptions,
      });
      operations = {
        timezone: hoursBundle.profile.timezone,
        temporarily_closed: hoursBundle.profile.temporarily_closed,
        temporarily_closed_reason:
          hoursBundle.profile.temporarily_closed_reason,
        ordering_allowed: evaluation.ordering_allowed,
        is_open_now: evaluation.is_open_now,
        status: evaluation.status,
        message: evaluation.message,
        local_date: evaluation.local_date,
        local_time: evaluation.local_time,
      };
    }
  } catch {
    // permissive default
  }

  const menu = await loadRestaurantMenu(supabase, restaurantId);
  const profile = await getRestaurantProfile(supabase, restaurantId);
  const serviceModes = serviceModesFromProfile(profile);
  const modifiersByItem: Record<string, unknown[]> = {};
  for (const m of menu.modifiers) {
    if (!modifiersByItem[m.item_id]) modifiersByItem[m.item_id] = [];
    modifiersByItem[m.item_id].push({
      id: m.id,
      group_name: m.group_name,
      modifier_name: m.modifier_name,
      extra_price: m.extra_price,
      min_selection: m.min_selection,
      max_selection: m.max_selection,
    });
  }

  const nested = menu.categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    sort_order: cat.sort_order,
    items: menu.items
      .filter((it) => it.category_id === cat.id)
      .map((it) => ({
        id: it.id,
        name: it.name,
        description: it.description,
        price: it.price,
        is_available: it.is_available,
        modifiers: modifiersByItem[it.id] ?? [],
      })),
  }));

  return {
    httpStatus: 200,
    body: {
      restaurant,
      categories: nested,
      restaurant_name_hint: restaurantNameHint ?? null,
      service_modes: serviceModes,
      operations,
    },
  };
}
