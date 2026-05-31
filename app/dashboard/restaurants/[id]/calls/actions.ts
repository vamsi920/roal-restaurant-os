"use server";

import { revalidatePath } from "next/cache";
import { requireRestaurantAccess } from "@/lib/auth/context-server";
import { createServerSupabase } from "@/lib/supabase/server";

const RESERVATION_STATUSES = new Set(["confirmed", "declined", "canceled"]);

export async function updateReservationRequestStatusAction(
  restaurantId: string,
  requestId: string,
  status: "confirmed" | "declined" | "canceled"
) {
  const rid = restaurantId.trim();
  const id = requestId.trim();
  if (!rid || !id) {
    throw new Error("Reservation request is required.");
  }
  if (!RESERVATION_STATUSES.has(status)) {
    throw new Error("Unsupported reservation status.");
  }

  const access = await requireRestaurantAccess(rid, { requireAdmin: true });
  if (access.errorResponse) {
    throw new Error("Admin or owner access required.");
  }

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("restaurant_reservation_requests")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("restaurant_id", rid)
    .select("id, status")
    .single();

  if (error) {
    throw new Error(`Could not update reservation request: ${error.message}`);
  }
  if (!data) {
    throw new Error("Reservation request not found.");
  }

  revalidatePath(`/dashboard/restaurants/${rid}/calls`);
  revalidatePath(`/dashboard/restaurants/${rid}`);
  return { ok: true as const, id: String(data.id), status: String(data.status) };
}
