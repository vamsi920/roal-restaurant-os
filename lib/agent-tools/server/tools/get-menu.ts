import { getDb, type Db } from "@/lib/db";
import {
  assertRestaurantIdMatches,
  GetMenuPostBodySchema,
  GetMenuQuerySchema,
  GetMenuResponseSchema,
  parseAgentToolRequest,
  parseAgentToolResponse,
} from "@/lib/agent-tools/schemas";
import { assertRestaurantToolOwnership, authenticateAgentToolRequest } from "@/lib/agent-tools/server/auth";
import {
  agentToolErrorResponse,
  agentToolJsonResponse,
  databaseErrorResponse,
  INVALID_JSON_BODY_OBJECT_HINT,
  methodNotAllowedResponse,
  readJsonBody,
} from "@/lib/agent-tools/server/json";
import { createAgentToolMeter, resolveRestaurantOrganizationId } from "@/lib/agent-tools/server/record-usage";
import { loadHoursForRestaurant } from "@/lib/agent-tools/server/restaurant-hours";

type Row = Record<string, unknown>;

/** get_menu_items — GET (query) or POST (JSON body). */
export async function handleGetMenu(req: Request, db: Db = getDb()): Promise<Response> {
  let bodyRestaurantId: string | undefined;
  let queryRestaurantId: string | null = null;
  let restaurantNameHint: string | null = null;

  if (req.method === "GET") {
    const url = new URL(req.url);
    const queryParsed = parseAgentToolRequest(
      GetMenuQuerySchema,
      {
        restaurant_id: url.searchParams.get("restaurant_id") ?? undefined,
        restaurant_name: url.searchParams.get("restaurant_name") ?? undefined,
      },
      { tool: "get_menu_items" }
    );
    if (!queryParsed.ok) return agentToolErrorResponse(queryParsed.body, queryParsed.status);
    bodyRestaurantId = queryParsed.data.restaurant_id;
    queryRestaurantId = queryParsed.data.restaurant_id ?? null;
    restaurantNameHint = queryParsed.data.restaurant_name ?? null;
  } else if (req.method === "POST") {
    const body = await readJsonBody(req);
    if (!body.ok) return agentToolErrorResponse(INVALID_JSON_BODY_OBJECT_HINT, 400);
    const bodyParsed = parseAgentToolRequest(GetMenuPostBodySchema, body.raw, { tool: "get_menu_items" });
    if (!bodyParsed.ok) return agentToolErrorResponse(bodyParsed.body, bodyParsed.status);
    bodyRestaurantId = bodyParsed.data.restaurant_id;
    queryRestaurantId = bodyParsed.data.restaurant_id ?? null;
    restaurantNameHint = bodyParsed.data.restaurant_name ?? null;
  } else {
    return methodNotAllowedResponse("Use GET or POST.");
  }

  const auth = await authenticateAgentToolRequest(req, bodyRestaurantId, queryRestaurantId);
  if (!auth.ok) return agentToolErrorResponse(auth.body, auth.status);

  const scopeCheck = assertRestaurantIdMatches(bodyRestaurantId, auth.restaurantId);
  if (!scopeCheck.ok) return agentToolErrorResponse(scopeCheck.body, scopeCheck.status);

  const restaurantId = auth.restaurantId;
  const organizationId = await resolveRestaurantOrganizationId(db, restaurantId);
  const meter = createAgentToolMeter(db, { organizationId, restaurantId, tool: "get_menu_items" });

  const ownership = await assertRestaurantToolOwnership(db, restaurantId, auth);
  if (!ownership.ok) {
    meter(ownership.status);
    return agentToolErrorResponse(ownership.body, ownership.status);
  }

  const { data: restaurant, error: rErr } = await db
    .from("restaurants")
    .select("id, name, created_at")
    .eq("id", restaurantId)
    .maybeSingle();

  if (rErr) {
    meter(500);
    return databaseErrorResponse(rErr.message);
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

  let operations: Row = {
    ordering_allowed: true,
    is_open_now: true,
    status: "open",
    message: "Hours not configured.",
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
    // permissive default
  }

  const { data: categories, error: cErr } = await db
    .from("categories")
    .select("id, name, sort_order")
    .eq("restaurant_id", restaurantId)
    .order("sort_order", { ascending: true });

  if (cErr) {
    meter(500);
    return databaseErrorResponse(cErr.message);
  }

  const cats = (categories ?? []) as Row[];
  const categoryIds = cats.map((c) => String(c.id));

  let nested: unknown[] = [];
  if (categoryIds.length > 0) {
    const { data: items, error: iErr } = await db
      .from("items")
      .select("id, category_id, name, description, price, is_available")
      .in("category_id", categoryIds)
      .order("name", { ascending: true });

    if (iErr) {
      meter(500);
      return databaseErrorResponse(iErr.message);
    }

    const itemList = (items ?? []) as Row[];
    const itemIds = itemList.map((i) => String(i.id));
    const modifiersByItem: Record<string, unknown[]> = {};

    if (itemIds.length > 0) {
      const { data: mods, error: mErr } = await db
        .from("modifiers")
        .select("id, item_id, group_name, modifier_name, extra_price, min_selection, max_selection")
        .in("item_id", itemIds);

      if (mErr) {
        meter(500);
        return databaseErrorResponse(mErr.message);
      }
      for (const m of (mods ?? []) as Row[]) {
        const iid = String(m.item_id);
        if (!modifiersByItem[iid]) modifiersByItem[iid] = [];
        modifiersByItem[iid].push(m);
      }
    }

    nested = cats.map((cat) => ({
      id: cat.id,
      name: cat.name,
      sort_order: cat.sort_order,
      items: itemList
        .filter((it) => it.category_id === cat.id)
        .map((it) => ({
          id: it.id,
          name: it.name,
          description: it.description,
          price: it.price,
          is_available: Boolean(it.is_available),
          modifiers: modifiersByItem[String(it.id)] ?? [],
        })),
    }));
  }

  const { data: profileRow, error: profileErr } = await db
    .from("restaurant_profiles")
    .select("allows_pickup, allows_delivery")
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (profileErr) {
    meter(500);
    return databaseErrorResponse(profileErr.message);
  }

  const service_modes = {
    pickup: profileRow?.allows_pickup === true,
    delivery: profileRow?.allows_delivery === true,
  };

  const responseBody = {
    restaurant,
    categories: nested,
    restaurant_name_hint: restaurantNameHint,
    service_modes,
    operations,
  };

  const validated = parseAgentToolResponse(GetMenuResponseSchema, responseBody, { tool: "get_menu_items" });
  if (!validated.ok) {
    meter(validated.status);
    return agentToolErrorResponse(validated.body, validated.status);
  }

  meter(200, {
    lineCount: validated.data.categories.reduce((n, c) => n + c.items.length, 0),
  });

  return agentToolJsonResponse(validated.data);
}
