import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ElevenLabsMenuAutoSyncStatus,
  ElevenLabsProvisionStatus,
  RestaurantProfile,
} from "@/lib/types";
import { parseUnavailableItemBehavior } from "@/lib/restaurant-profile/handoff-rules";
import type { RestaurantProfileInput } from "@/lib/restaurant-profile/schema";

const PROVISION_STATUSES: readonly ElevenLabsProvisionStatus[] = [
  "pending",
  "provisioning",
  "ready",
  "failed",
];

const MENU_AUTO_SYNC_STATUSES: readonly ElevenLabsMenuAutoSyncStatus[] = [
  "pending",
  "syncing",
  "succeeded",
  "failed",
];

function parseProvisionStatus(value: unknown): ElevenLabsProvisionStatus | null {
  if (typeof value !== "string") return null;
  return PROVISION_STATUSES.includes(value as ElevenLabsProvisionStatus)
    ? (value as ElevenLabsProvisionStatus)
    : null;
}

function parseMenuAutoSyncStatus(
  value: unknown
): ElevenLabsMenuAutoSyncStatus | null {
  if (typeof value !== "string") return null;
  return MENU_AUTO_SYNC_STATUSES.includes(value as ElevenLabsMenuAutoSyncStatus)
    ? (value as ElevenLabsMenuAutoSyncStatus)
    : null;
}

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
    handoff_catering_route: null,
    handoff_complaint_route: null,
    handoff_unavailable_item_behavior: null,
    handoff_unavailable_item_notes: null,
    closed_hours_message: null,
    temporarily_closed: false,
    temporarily_closed_reason: null,
    elevenlabs_agent_id: null,
    elevenlabs_provision_status: null,
    elevenlabs_provision_error: null,
    elevenlabs_provisioned_at: null,
    elevenlabs_menu_auto_sync_status: null,
    elevenlabs_menu_auto_sync_error: null,
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
    handoff_catering_route:
      row.handoff_catering_route != null
        ? String(row.handoff_catering_route)
        : null,
    handoff_complaint_route:
      row.handoff_complaint_route != null
        ? String(row.handoff_complaint_route)
        : null,
    handoff_unavailable_item_behavior: parseUnavailableItemBehavior(
      row.handoff_unavailable_item_behavior
    ),
    handoff_unavailable_item_notes:
      row.handoff_unavailable_item_notes != null
        ? String(row.handoff_unavailable_item_notes)
        : null,
    closed_hours_message:
      row.closed_hours_message != null
        ? String(row.closed_hours_message)
        : null,
    temporarily_closed: Boolean(row.temporarily_closed),
    temporarily_closed_reason:
      row.temporarily_closed_reason != null
        ? String(row.temporarily_closed_reason)
        : null,
    elevenlabs_agent_id:
      row.elevenlabs_agent_id != null ? String(row.elevenlabs_agent_id) : null,
    elevenlabs_provision_status: parseProvisionStatus(
      row.elevenlabs_provision_status
    ),
    elevenlabs_provision_error:
      row.elevenlabs_provision_error != null
        ? String(row.elevenlabs_provision_error)
        : null,
    elevenlabs_provisioned_at:
      row.elevenlabs_provisioned_at != null
        ? String(row.elevenlabs_provisioned_at)
        : null,
    elevenlabs_menu_auto_sync_status: parseMenuAutoSyncStatus(
      row.elevenlabs_menu_auto_sync_status
    ),
    elevenlabs_menu_auto_sync_error:
      row.elevenlabs_menu_auto_sync_error != null
        ? String(row.elevenlabs_menu_auto_sync_error)
        : null,
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

export function serviceModesFromProfile(
  profile: RestaurantProfile | null
): { pickup: boolean; delivery: boolean } {
  return {
    pickup: profile?.allows_pickup === true,
    delivery: profile?.allows_delivery === true,
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
    handoff_catering_route: input.handoff_catering_route,
    handoff_complaint_route: input.handoff_complaint_route,
    handoff_unavailable_item_behavior: input.handoff_unavailable_item_behavior,
    handoff_unavailable_item_notes: input.handoff_unavailable_item_notes,
    closed_hours_message: input.closed_hours_message,
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
