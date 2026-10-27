"use server";

import { revalidatePath } from "next/cache";
import { requireRestaurantAccess } from "@/lib/auth/context-server";
import { getDb } from "@/lib/db";
import { afterProfileSettingsMutation } from "@/lib/voice-agent/after-restaurant-settings-mutation";

export type TakingOrdersResult =
  | { ok: true; takingOrders: boolean }
  | { ok: false; error: string };

/**
 * Sidebar "Taking orders" switch. Flips `restaurant_profiles.temporarily_closed`
 * and re-syncs the voice host (same post-save path as profile edits) so callers
 * hear the change on the next call.
 */
export async function setRestaurantTakingOrdersAction(
  restaurantId: string,
  takingOrders: boolean
): Promise<TakingOrdersResult> {
  const access = await requireRestaurantAccess(restaurantId);
  if (access.errorResponse) {
    const status = access.errorResponse.status;
    if (status === 401) return { ok: false, error: "Sign in to change this." };
    if (status === 404) return { ok: false, error: "Location not found." };
    return { ok: false, error: "You do not have access to this location." };
  }

  const supabase = getDb();
  const { data, error } = await supabase
    .from("restaurant_profiles")
    .update({
      temporarily_closed: !takingOrders,
      // The reason is read aloud in the closed greeting ("We're temporarily closed
      // right now—{reason}"), so a dashboard pause leaves it empty.
      temporarily_closed_reason: null,
    })
    .eq("restaurant_id", restaurantId)
    .select("restaurant_id");

  if (error) {
    return { ok: false, error: "Could not update the location. Try again." };
  }
  if (!data || data.length === 0) {
    return { ok: false, error: "Finish your business info first, then try again." };
  }

  afterProfileSettingsMutation(restaurantId, {
    userId: access.context.user.id,
    restaurantName: access.access.restaurant.name,
  });
  revalidatePath("/dashboard", "layout");

  return { ok: true, takingOrders };
}
