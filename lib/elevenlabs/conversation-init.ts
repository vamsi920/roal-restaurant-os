import {
  DEFAULT_RESTAURANT_NAME,
  mergeRestaurantPlaceholders,
} from "@/lib/elevenlabs-placeholders";
import { getServiceRoleSupabase } from "@/lib/supabase/server";

export const ELEVENLABS_CONVERSATION_INIT_SECRET_HEADER =
  "x-roal-conversation-init-secret";

/** When `ELEVENLABS_CONVERSATION_INIT_SECRET` is unset, all requests are allowed. */
export function isElevenLabsConversationInitAuthorized(options: {
  configuredSecret?: string;
  headerSecret?: string | null;
  querySecret?: string | null;
}): boolean {
  const secret = options.configuredSecret?.trim();
  if (!secret) return true;
  const header = options.headerSecret?.trim();
  const query = options.querySecret?.trim();
  return header === secret || query === secret;
}

/** Agent id from query (`agent_id` / `agentId`) or JSON body (ElevenLabs Twilio POST). */
export function readElevenLabsConversationInitAgentId(
  url: URL,
  body: unknown
): string {
  const fromQuery =
    url.searchParams.get("agent_id")?.trim() ||
    url.searchParams.get("agentId")?.trim() ||
    "";
  if (fromQuery) return fromQuery;
  if (!body || typeof body !== "object") return "";
  const b = body as Record<string, unknown>;
  if (typeof b.agent_id === "string" && b.agent_id.trim()) return b.agent_id.trim();
  if (typeof b.agentId === "string" && b.agentId.trim()) return b.agentId.trim();
  return "";
}

export type ElevenLabsConversationInitPayload = {
  type: "conversation_initiation_client_data";
  dynamic_variables: Record<string, string>;
};

export function buildElevenLabsConversationInitPayload(input: {
  restaurantId: string;
  restaurantName: string;
}): ElevenLabsConversationInitPayload {
  const vars = mergeRestaurantPlaceholders(
    {},
    input.restaurantId,
    input.restaurantName
  );
  return {
    type: "conversation_initiation_client_data",
    dynamic_variables: vars,
  };
}

/** Resolve restaurant context for an inbound Twilio call (agent_id from ElevenLabs). */
export async function lookupRestaurantForElevenLabsAgent(
  agentId: string
): Promise<{ restaurantId: string; restaurantName: string } | null> {
  const aid = agentId.trim();
  if (!aid) return null;

  const supabase = getServiceRoleSupabase();
  if (!supabase) return null;

  const { data: profile, error: profileErr } = await supabase
    .from("restaurant_profiles")
    .select("restaurant_id")
    .eq("elevenlabs_agent_id", aid)
    .maybeSingle();

  if (profileErr || !profile?.restaurant_id) return null;

  const rid = String(profile.restaurant_id);
  const { data: restaurant, error: restErr } = await supabase
    .from("restaurants")
    .select("name")
    .eq("id", rid)
    .maybeSingle();

  if (restErr) return { restaurantId: rid, restaurantName: DEFAULT_RESTAURANT_NAME };

  const name =
    typeof restaurant?.name === "string" && restaurant.name.trim()
      ? restaurant.name.trim()
      : DEFAULT_RESTAURANT_NAME;

  return { restaurantId: rid, restaurantName: name };
}
