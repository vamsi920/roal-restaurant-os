"use server";

import { revalidatePath } from "next/cache";
import { requireRestaurantAccess } from "@/lib/auth/context-server";
import { getDb } from "@/lib/db";
import { deletePosConnection } from "@/lib/pos/connections";

export async function disconnectRegisterAction(restaurantId: string): Promise<{ ok: boolean; error?: string }> {
  const access = await requireRestaurantAccess(restaurantId, { requireAdmin: true });
  if (access.errorResponse) return { ok: false, error: "Only an owner or admin can disconnect the register." };
  try {
    await deletePosConnection(getDb(), restaurantId);
  } catch {
    return { ok: false, error: "Could not disconnect. Try again." };
  }
  revalidatePath(`/dashboard/restaurants/${restaurantId}/settings`);
  return { ok: true };
}
