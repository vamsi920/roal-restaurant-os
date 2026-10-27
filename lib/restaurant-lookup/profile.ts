import type { Db } from "@/lib/db";
import type { RestaurantProfileInput } from "@/lib/restaurant-profile/schema";
import type { PlaceSnapshot } from "@/lib/restaurant-lookup/types";
import type { WeeklyHourInput } from "@/lib/restaurant-hours/core";

export function profileInputFromSnapshot(
  snapshot: PlaceSnapshot
): RestaurantProfileInput {
  const p = snapshot.profile;
  const phone = p.phone && /^[\d\s+().-]{7,24}$/.test(p.phone) ? p.phone : null;
  return {
    name: p.name,
    phone,
    address_line1: p.address_line1,
    address_line2: p.address_line2,
    city: p.city,
    region: p.region,
    postal_code: p.postal_code,
    country: p.country || "US",
    timezone: p.timezone || "America/Chicago",
    cuisine: null,
    website: p.website,
    allows_pickup: true,
    allows_delivery: false,
    prep_time_minutes: 20,
    tax_rate_percent: 0,
    service_fee_percent: 0,
    escalation_name: null,
    escalation_phone: null,
    escalation_email: null,
    handoff_catering_route: null,
    handoff_complaint_route: null,
    handoff_unavailable_item_behavior: null,
    handoff_unavailable_item_notes: null,
    closed_hours_message: null,
  };
}

export async function saveWeeklyHoursFromLookup(
  supabase: Db,
  restaurantId: string,
  weekly: WeeklyHourInput[]
): Promise<void> {
  const now = new Date().toISOString();
  for (const row of weekly) {
    const { error } = await supabase.from("restaurant_weekly_hours").upsert(
      {
        restaurant_id: restaurantId,
        day_of_week: row.day_of_week,
        is_closed: row.is_closed,
        open_time: row.is_closed ? null : row.open_time,
        close_time: row.is_closed ? null : row.close_time,
        updated_at: now,
      },
      { onConflict: "restaurant_id,day_of_week" }
    );
    if (error) throw new Error(error.message);
  }
}
