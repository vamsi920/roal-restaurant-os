import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  serviceModesFromProfileFlags,
  type FulfillmentServiceModes,
} from "./order-validate.ts";

export async function loadFulfillmentServiceModes(
  supabase: SupabaseClient,
  restaurantId: string
): Promise<FulfillmentServiceModes> {
  const { data, error } = await supabase
    .from("restaurant_profiles")
    .select("allows_pickup, allows_delivery")
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return serviceModesFromProfileFlags(data);
}
