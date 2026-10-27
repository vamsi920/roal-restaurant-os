import { getDb, type Db } from "@/lib/db";
import {
  assertRestaurantIdMatches,
  GetRestaurantInfoPostBodySchema,
  GetRestaurantInfoQuerySchema,
  GetRestaurantInfoResponseSchema,
  parseAgentToolRequest,
  parseAgentToolResponse,
  type ParseResult,
} from "@/lib/agent-tools/schemas";
import { assertRestaurantToolOwnership, authenticateAgentToolRequest } from "@/lib/agent-tools/server/auth";
import {
  agentToolErrorResponse,
  agentToolJsonResponse,
  databaseErrorResponse,
  INVALID_JSON_BODY_OBJECT_HINT,
  readJsonBody,
} from "@/lib/agent-tools/server/json";
import { createAgentToolMeter, resolveRestaurantOrganizationId } from "@/lib/agent-tools/server/record-usage";
import { loadHoursForRestaurant } from "@/lib/agent-tools/server/restaurant-hours";

const TOOL = "get_restaurant_info" as const;

type JsonRecord = Record<string, unknown>;
type InfoInput = { restaurant_id?: string; restaurant_name?: string };

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function bool(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function intOrNull(value: unknown): number | null {
  const n = Number(value);
  return Number.isInteger(n) ? n : null;
}

function addressDisplay(profile: JsonRecord | null): string | null {
  if (!profile) return null;
  const line1 = text(profile.address_line1);
  const line2 = text(profile.address_line2);
  const city = text(profile.city);
  const region = text(profile.region);
  const postal = text(profile.postal_code);
  const country = text(profile.country);
  const cityLine = [city, region, postal].filter(Boolean).join(", ");
  return [line1, line2, cityLine, country].filter(Boolean).join(", ") || null;
}

function prepMessage(minutes: number | null): string {
  if (!minutes) {
    return "Prep time is not configured. Do not guess a pickup time.";
  }
  return `Typical pickup prep time is about ${minutes} minutes. Quote this as an estimate, not a promise.`;
}

async function parseInput(req: Request): Promise<ParseResult<InfoInput> | { ok: false; status: number; body: JsonRecord }> {
  if (req.method === "GET") {
    const url = new URL(req.url);
    return parseAgentToolRequest(
      GetRestaurantInfoQuerySchema,
      {
        restaurant_id: url.searchParams.get("restaurant_id") ?? undefined,
        restaurant_name: url.searchParams.get("restaurant_name") ?? undefined,
      },
      { tool: TOOL }
    );
  }

  if (req.method === "POST") {
    const body = await readJsonBody(req);
    if (!body.ok) return { ok: false as const, status: 400, body: { ...INVALID_JSON_BODY_OBJECT_HINT } };
    return parseAgentToolRequest(GetRestaurantInfoPostBodySchema, body.raw, { tool: TOOL });
  }

  return {
    ok: false as const,
    status: 405,
    body: { error: "method_not_allowed", code: "method_not_allowed", message: "Use GET or POST." },
  };
}

/** get_restaurant_info — GET (query) or POST (JSON body). Hours, address, prep time, FAQ. */
export async function handleGetRestaurantInfo(req: Request, db: Db = getDb()): Promise<Response> {
  const parsed = await parseInput(req);
  if (!parsed.ok) return agentToolErrorResponse(parsed.body, parsed.status);

  const bodyRestaurantId = parsed.data.restaurant_id;
  const auth = await authenticateAgentToolRequest(req, bodyRestaurantId, bodyRestaurantId ?? null);
  if (!auth.ok) return agentToolErrorResponse(auth.body, auth.status);

  const scopeCheck = assertRestaurantIdMatches(bodyRestaurantId, auth.restaurantId);
  if (!scopeCheck.ok) return agentToolErrorResponse(scopeCheck.body, scopeCheck.status);

  const restaurantId = auth.restaurantId;
  const organizationId = await resolveRestaurantOrganizationId(db, restaurantId);
  const meter = createAgentToolMeter(db, { organizationId, restaurantId, tool: TOOL });

  const ownership = await assertRestaurantToolOwnership(db, restaurantId, auth);
  if (!ownership.ok) {
    meter(ownership.status);
    return agentToolErrorResponse(ownership.body, ownership.status);
  }

  const { data: restaurant, error: restaurantError } = await db
    .from("restaurants")
    .select("id, name")
    .eq("id", restaurantId)
    .maybeSingle();

  if (restaurantError) {
    meter(500);
    return databaseErrorResponse(restaurantError.message);
  }
  if (!restaurant) {
    meter(404);
    return agentToolErrorResponse(
      {
        error: "not_found",
        code: "restaurant_not_found",
        message: "Restaurant not found.",
        recovery_hint: "Verify restaurant_id matches this agent's connected location.",
      },
      404
    );
  }

  const { data: profile, error: profileError } = await db
    .from("restaurant_profiles")
    .select(
      "phone, address_line1, address_line2, city, region, postal_code, country, cuisine, website, allows_pickup, allows_delivery, prep_time_minutes"
    )
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (profileError) {
    meter(500);
    return databaseErrorResponse(profileError.message);
  }

  let operations: JsonRecord = {
    ordering_allowed: false,
    is_open_now: false,
    status: "closed",
    message: "Hours are not configured for this location. Do not tell the caller the restaurant is open now.",
    weekly_hours: [],
    upcoming_exceptions: [],
  };
  try {
    const hours = await loadHoursForRestaurant(db, restaurantId);
    operations = {
      timezone: hours.profile.timezone,
      temporarily_closed: hours.profile.temporarily_closed,
      temporarily_closed_reason: hours.profile.temporarily_closed_reason,
      ordering_allowed: hours.evaluation.ordering_allowed,
      is_open_now: hours.evaluation.is_open_now,
      status: hours.evaluation.status,
      message: hours.evaluation.message,
      local_date: hours.evaluation.local_date,
      local_time: hours.evaluation.local_time,
      weekly_hours: hours.weekly,
      upcoming_exceptions: hours.exceptions,
    };
  } catch {
    // Keep unconfigured operations; do not invent open hours.
  }

  const { data: entries, error: entriesError } = await db
    .from("restaurant_knowledge_entries")
    .select("category, question, answer")
    .eq("restaurant_id", restaurantId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(24);

  if (entriesError) {
    meter(500);
    return databaseErrorResponse(entriesError.message);
  }

  const p = (profile ?? null) as JsonRecord | null;
  const prep = intOrNull(p?.prep_time_minutes);
  const knowledgeRows = (entries ?? []) as JsonRecord[];
  const responseBody = {
    ok: true as const,
    restaurant: {
      id: restaurant.id,
      name: restaurant.name,
      phone: text(p?.phone),
      website: text(p?.website),
      cuisine: text(p?.cuisine),
      address: {
        line1: text(p?.address_line1),
        line2: text(p?.address_line2),
        city: text(p?.city),
        region: text(p?.region),
        postal_code: text(p?.postal_code),
        country: text(p?.country),
        display: addressDisplay(p),
      },
      service_modes: {
        pickup: p ? bool(p.allows_pickup) : false,
        delivery: p ? bool(p.allows_delivery) : false,
      },
      prep_time_minutes: prep,
      prep_time_message: prepMessage(prep),
    },
    operations,
    knowledge_entries: knowledgeRows.map((entry) => ({
      category: String(entry.category ?? "general"),
      question: String(entry.question ?? ""),
      answer: String(entry.answer ?? ""),
    })),
    knowledge_status_message:
      knowledgeRows.length > 0
        ? "Use only the knowledge_entries in this response for operator-approved FAQ answers."
        : "No operator FAQ entries are configured for this location. Do not invent policies, allergens, parking, catering, refund, or reservation answers—use profile address, operations hours, get_menu_items, or offer a staff callback.",
  };

  const validated = parseAgentToolResponse(GetRestaurantInfoResponseSchema, responseBody, { tool: TOOL });
  if (!validated.ok) {
    meter(validated.status);
    return agentToolErrorResponse(validated.body, validated.status);
  }

  meter(200);
  return agentToolJsonResponse(validated.data);
}
