import type { SupabaseClient } from "@supabase/supabase-js";
import {
  sanitizeUsageMetadata,
  truncateSessionId,
} from "@/lib/usage/sanitize";
import type { RecordUsageEventInput } from "@/lib/usage/types";

export async function recordUsageEvent(
  supabase: SupabaseClient,
  input: RecordUsageEventInput
): Promise<void> {
  const organizationId = input.organizationId?.trim();
  if (!organizationId) return;

  const payload = {
    event_type: input.eventType,
    organization_id: organizationId,
    restaurant_id: input.restaurantId?.trim() || null,
    user_id: input.userId?.trim() || null,
    session_id: truncateSessionId(input.sessionId),
    idempotency_key: input.idempotencyKey?.trim() || null,
    metadata: sanitizeUsageMetadata(input.metadata),
    ...(input.occurredAt ? { occurred_at: input.occurredAt } : {}),
  };

  const { error } = await supabase.from("usage_events").insert(payload);

  if (error && error.code !== "23505") {
    console.error("[usage] recordUsageEvent failed", input.eventType, error.message);
  }
}

/** At most one active_location event per restaurant per UTC day. */
export async function recordActiveLocation(
  supabase: SupabaseClient,
  scope: {
    organizationId: string;
    restaurantId: string;
    userId?: string | null;
  }
): Promise<void> {
  const day = new Date().toISOString().slice(0, 10);
  await recordUsageEvent(supabase, {
    eventType: "active_location",
    organizationId: scope.organizationId,
    restaurantId: scope.restaurantId,
    userId: scope.userId,
    idempotencyKey: `active_location:${scope.restaurantId}:${day}`,
    metadata: { day },
  });
}

export async function recordRestaurantUsage(
  supabase: SupabaseClient,
  input: RecordUsageEventInput
): Promise<void> {
  await recordUsageEvent(supabase, input);
  if (input.restaurantId) {
    await recordActiveLocation(supabase, {
      organizationId: input.organizationId,
      restaurantId: input.restaurantId,
      userId: input.userId,
    });
  }
}

export async function resolveRestaurantOrganizationId(
  supabase: SupabaseClient,
  restaurantId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("restaurants")
    .select("organization_id")
    .eq("id", restaurantId)
    .maybeSingle();

  if (error || !data?.organization_id) return null;
  return String(data.organization_id);
}
