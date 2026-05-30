import { getConvaiAgent } from "@/lib/elevenlabs";
import {
  DEFAULT_RESTAURANT_NAME,
  finalizeConversationInitDynamicVariables,
  mergeRestaurantPlaceholders,
  readAgentDynamicPlaceholders,
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

function readStringField(
  url: URL,
  body: unknown,
  keys: string[]
): string {
  for (const key of keys) {
    const fromQuery = url.searchParams.get(key)?.trim();
    if (fromQuery) return fromQuery;
  }
  if (!body || typeof body !== "object") return "";
  const b = body as Record<string, unknown>;
  for (const key of keys) {
    const val = b[key];
    if (typeof val === "string" && val.trim()) return val.trim();
  }
  return "";
}

/** Agent id from query (`agent_id` / `agentId`) or JSON/form body (ElevenLabs Twilio POST). */
export function readElevenLabsConversationInitAgentId(
  url: URL,
  body: unknown
): string {
  return readStringField(url, body, ["agent_id", "agentId"]);
}

/** Inbound Twilio line (`called_number`, `To`, etc.) for per-location phone routing. */
export function readElevenLabsConversationInitCalledNumber(
  url: URL,
  body: unknown
): string {
  return readStringField(url, body, [
    "called_number",
    "calledNumber",
    "to",
    "To",
    "phone_number",
  ]);
}

/** Last 10 digits for matching `restaurant_profiles.phone` (US-centric). */
export function phoneLookupKey(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  return digits.slice(-10);
}

/** Parse ElevenLabs Twilio POST (JSON or application/x-www-form-urlencoded). */
export async function parseElevenLabsConversationInitRequestBody(
  req: Request
): Promise<unknown> {
  if (req.method !== "POST") return {};
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const raw = await req.text();
    if (!raw.trim()) return {};
    return Object.fromEntries(new URLSearchParams(raw).entries());
  }
  if (contentType.includes("application/json") || contentType.includes("+json")) {
    return req.json().catch(() => ({}));
  }
  const raw = await req.text();
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    if (raw.includes("=")) {
      return Object.fromEntries(new URLSearchParams(raw).entries());
    }
    return {};
  }
}

export type ElevenLabsConversationInitPayload = {
  type: "conversation_initiation_client_data";
  dynamic_variables: Record<string, string>;
};

export function buildElevenLabsConversationInitPayload(input: {
  restaurantId: string;
  restaurantName: string;
  /** Agent placeholder keys from ElevenLabs (must include all defined dynamic variables). */
  agentPlaceholders?: Record<string, string>;
}): ElevenLabsConversationInitPayload {
  const vars = mergeRestaurantPlaceholders(
    input.agentPlaceholders ?? {},
    input.restaurantId,
    input.restaurantName
  );
  return {
    type: "conversation_initiation_client_data",
    dynamic_variables: finalizeConversationInitDynamicVariables(vars),
  };
}

/** Load agent placeholders from ElevenLabs so webhook returns every required dynamic variable. */
export async function readAgentPlaceholdersForInit(
  agentId: string
): Promise<Record<string, string>> {
  try {
    const agent = await getConvaiAgent(agentId.trim());
    return readAgentDynamicPlaceholders(agent);
  } catch {
    return {};
  }
}

export type ConversationInitRestaurantContext = {
  restaurantId: string;
  restaurantName: string;
  /** Profile `elevenlabs_agent_id` used for placeholder fetch. */
  linkedAgentId: string;
  resolvedVia: "agent_id" | "called_number";
};

async function loadRestaurantName(
  supabase: NonNullable<ReturnType<typeof getServiceRoleSupabase>>,
  restaurantId: string
): Promise<string> {
  const { data: restaurant, error } = await supabase
    .from("restaurants")
    .select("name")
    .eq("id", restaurantId)
    .maybeSingle();

  if (error) return DEFAULT_RESTAURANT_NAME;

  return typeof restaurant?.name === "string" && restaurant.name.trim()
    ? restaurant.name.trim()
    : DEFAULT_RESTAURANT_NAME;
}

/** Resolve restaurant by dedicated agent id (`restaurant_profiles.elevenlabs_agent_id`). */
export async function lookupRestaurantForElevenLabsAgent(
  agentId: string
): Promise<{ restaurantId: string; restaurantName: string } | null> {
  const ctx = await resolveRestaurantBySavedAgentId(agentId);
  if (!ctx) return null;
  return {
    restaurantId: ctx.restaurantId,
    restaurantName: ctx.restaurantName,
  };
}

async function resolveRestaurantBySavedAgentId(
  agentId: string
): Promise<Omit<ConversationInitRestaurantContext, "resolvedVia"> | null> {
  const aid = agentId.trim();
  if (!aid) return null;

  const supabase = getServiceRoleSupabase();
  if (!supabase) return null;

  const { data: profile, error: profileErr } = await supabase
    .from("restaurant_profiles")
    .select("restaurant_id, elevenlabs_agent_id")
    .eq("elevenlabs_agent_id", aid)
    .maybeSingle();

  if (profileErr || !profile?.restaurant_id) return null;

  const restaurantId = String(profile.restaurant_id);
  const restaurantName = await loadRestaurantName(supabase, restaurantId);
  const linkedAgentId =
    typeof profile.elevenlabs_agent_id === "string" &&
    profile.elevenlabs_agent_id.trim()
      ? profile.elevenlabs_agent_id.trim()
      : aid;

  return { restaurantId, restaurantName, linkedAgentId };
}

/** Resolve restaurant by inbound Twilio number matching `restaurant_profiles.phone`. */
export async function lookupRestaurantByCalledNumber(
  calledNumber: string
): Promise<Omit<ConversationInitRestaurantContext, "resolvedVia"> | null> {
  const key = phoneLookupKey(calledNumber);
  if (!key) return null;

  const supabase = getServiceRoleSupabase();
  if (!supabase) return null;

  const { data: profiles, error } = await supabase
    .from("restaurant_profiles")
    .select("restaurant_id, phone, elevenlabs_agent_id")
    .not("phone", "is", null);

  if (error || !profiles?.length) return null;

  const match = profiles.find((row) => {
    const phone =
      typeof row.phone === "string" ? row.phone : String(row.phone ?? "");
    return phoneLookupKey(phone) === key;
  });

  if (!match?.restaurant_id) return null;

  const restaurantId = String(match.restaurant_id);
  const restaurantName = await loadRestaurantName(supabase, restaurantId);
  const linkedAgentId =
    typeof match.elevenlabs_agent_id === "string" &&
    match.elevenlabs_agent_id.trim()
      ? match.elevenlabs_agent_id.trim()
      : "";

  return { restaurantId, restaurantName, linkedAgentId };
}

/**
 * Resolve restaurant for inbound Twilio: saved profile agent id first, then called line.
 */
export async function resolveRestaurantForElevenLabsConversationInit(input: {
  agentId: string;
  calledNumber?: string | null;
}): Promise<ConversationInitRestaurantContext | null> {
  const agentId = input.agentId.trim();
  const calledNumber = input.calledNumber?.trim() ?? "";

  if (agentId) {
    const byAgent = await resolveRestaurantBySavedAgentId(agentId);
    if (byAgent) {
      return { ...byAgent, resolvedVia: "agent_id" };
    }
  }

  if (calledNumber) {
    const byPhone = await lookupRestaurantByCalledNumber(calledNumber);
    if (byPhone) {
      const linkedAgentId = byPhone.linkedAgentId || agentId;
      if (!linkedAgentId) return null;
      return {
        ...byPhone,
        linkedAgentId,
        resolvedVia: "called_number",
      };
    }
  }

  return null;
}
