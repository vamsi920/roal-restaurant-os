"use server";

import { revalidatePath } from "next/cache";
import { requireRestaurantAccess } from "@/lib/auth/context-server";
import {
  isReservationOwnerUpdateStatus,
  type ReservationOwnerUpdateStatus,
} from "@/lib/restaurant-reservations/schema";
import { createServerSupabase } from "@/lib/supabase/server";

export async function updateReservationRequestStatusAction(
  restaurantId: string,
  requestId: string,
  status: ReservationOwnerUpdateStatus
) {
  const rid = restaurantId.trim();
  const id = requestId.trim();
  if (!rid || !id) {
    throw new Error("Reservation request is required.");
  }
  if (!isReservationOwnerUpdateStatus(status)) {
    throw new Error("Unsupported reservation status.");
  }

  const access = await requireRestaurantAccess(rid);
  if (access.errorResponse) {
    throw new Error("You do not have access to update this reservation.");
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
