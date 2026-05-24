import type { SupabaseClient } from "@supabase/supabase-js";
import type { RestaurantProfile } from "@/lib/types";
import type { RestaurantProfileInput } from "@/lib/restaurant-profile/schema";

export function defaultRestaurantProfile(
  restaurantId: string,
  organizationId: string
): RestaurantProfile {
  const now = new Date().toISOString();
  return {
    restaurant_id: restaurantId,
    organization_id: organizationId,
    phone: null,
    address_line1: null,
    address_line2: null,
    city: null,
    region: null,
    postal_code: null,
    country: "US",
    timezone: "America/Chicago",
    cuisine: null,
    website: null,
    allows_pickup: true,
    allows_delivery: false,
    prep_time_minutes: 20,
    tax_rate_percent: 0,
    service_fee_percent: 0,
    escalation_name: null,
    escalation_phone: null,
    escalation_email: null,
    temporarily_closed: false,
    temporarily_closed_reason: null,
    elevenlabs_agent_id: null,
    elevenlabs_last_sync_at: null,
    elevenlabs_last_sync_error: null,
    elevenlabs_last_sync_summary: null,
    created_at: now,
    updated_at: now,
  };
}

function mapRow(row: Record<string, unknown>): RestaurantProfile {
  return {
    restaurant_id: String(row.restaurant_id),
    organization_id: String(row.organization_id),
    phone: row.phone != null ? String(row.phone) : null,
    address_line1: row.address_line1 != null ? String(row.address_line1) : null,
    address_line2: row.address_line2 != null ? String(row.address_line2) : null,
    city: row.city != null ? String(row.city) : null,
    region: row.region != null ? String(row.region) : null,
    postal_code: row.postal_code != null ? String(row.postal_code) : null,
    country: String(row.country ?? "US"),
    timezone: String(row.timezone ?? "America/Chicago"),
    cuisine: row.cuisine != null ? String(row.cuisine) : null,
    website: row.website != null ? String(row.website) : null,
    allows_pickup: Boolean(row.allows_pickup),
    allows_delivery: Boolean(row.allows_delivery),
    prep_time_minutes: Number(row.prep_time_minutes ?? 20),
    tax_rate_percent: Number(row.tax_rate_percent ?? 0),
    service_fee_percent: Number(row.service_fee_percent ?? 0),
    escalation_name:
      row.escalation_name != null ? String(row.escalation_name) : null,
    escalation_phone:
      row.escalation_phone != null ? String(row.escalation_phone) : null,
    escalation_email:
      row.escalation_email != null ? String(row.escalation_email) : null,
    temporarily_closed: Boolean(row.temporarily_closed),
    temporarily_closed_reason:
      row.temporarily_closed_reason != null
        ? String(row.temporarily_closed_reason)
        : null,
    elevenlabs_agent_id:
      row.elevenlabs_agent_id != null ? String(row.elevenlabs_agent_id) : null,
    elevenlabs_last_sync_at:
      row.elevenlabs_last_sync_at != null
        ? String(row.elevenlabs_last_sync_at)
        : null,
    elevenlabs_last_sync_error:
      row.elevenlabs_last_sync_error != null
        ? String(row.elevenlabs_last_sync_error)
        : null,
    elevenlabs_last_sync_summary: row.elevenlabs_last_sync_summary ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function getRestaurantProfile(
  supabase: SupabaseClient,
  restaurantId: string
): Promise<RestaurantProfile | null> {
  const { data, error } = await supabase
    .from("restaurant_profiles")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapRow(data as Record<string, unknown>);
}

export async function ensureRestaurantProfile(
  supabase: SupabaseClient,
  restaurantId: string,
  organizationId: string
): Promise<RestaurantProfile> {
  const existing = await getRestaurantProfile(supabase, restaurantId);
  if (existing) return existing;

  const row = defaultRestaurantProfile(restaurantId, organizationId);
  const { data, error } = await supabase
    .from("restaurant_profiles")
    .insert({
      restaurant_id: row.restaurant_id,
      organization_id: row.organization_id,
      timezone: row.timezone,
      country: row.country,
      allows_pickup: row.allows_pickup,
      allows_delivery: row.allows_delivery,
      prep_time_minutes: row.prep_time_minutes,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data as Record<string, unknown>);
}

export async function upsertRestaurantProfile(
  supabase: SupabaseClient,
  restaurantId: string,
  organizationId: string,
  input: RestaurantProfileInput
): Promise<RestaurantProfile> {
  await ensureRestaurantProfile(supabase, restaurantId, organizationId);

  const { error: nameErr } = await supabase
    .from("restaurants")
    .update({ name: input.name })
    .eq("id", restaurantId);

  if (nameErr) throw new Error(nameErr.message);

  const payload = {
    phone: input.phone,
    address_line1: input.address_line1,
    address_line2: input.address_line2,
    city: input.city,
    region: input.region,
    postal_code: input.postal_code,
    country: input.country,
    timezone: input.timezone,
    cuisine: input.cuisine,
    website: input.website,
    allows_pickup: input.allows_pickup,
    allows_delivery: input.allows_delivery,
    prep_time_minutes: input.prep_time_minutes,
    tax_rate_percent: input.tax_rate_percent,
    service_fee_percent: input.service_fee_percent,
    escalation_name: input.escalation_name,
    escalation_phone: input.escalation_phone,
    escalation_email: input.escalation_email,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("restaurant_profiles")
    .update(payload)
    .eq("restaurant_id", restaurantId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data as Record<string, unknown>);
}

export function formatProfileAddress(profile: RestaurantProfile): string | null {
  const parts = [
    profile.address_line1,
    profile.address_line2,
    [profile.city, profile.region].filter(Boolean).join(", "),
    profile.postal_code,
  ].filter((p) => p && p.trim().length > 0);
  return parts.length > 0 ? parts.join(" · ") : null;
}
