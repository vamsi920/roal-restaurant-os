import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { loadHoursForRestaurant } from "../_shared/restaurant-hours.ts";
import {
  assertRestaurantToolOwnership,
  authenticateAgentToolRequest,
} from "../_shared/agent-tool-auth.ts";
import {
  agentToolErrorResponse,
  agentToolJsonResponse,
  corsHeaders,
} from "../_shared/agent-tool-json.ts";
import {
  assertRestaurantIdMatches,
  GetMenuPostBodySchema,
  GetMenuQuerySchema,
  GetMenuResponseSchema,
  parseAgentToolRequest,
  parseAgentToolResponse,
} from "../_shared/agent-tool-zod.ts";
import {
  createAgentToolMeter,
  resolveRestaurantOrganizationId,
} from "../_shared/record-usage.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

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
    if (!queryParsed.ok) {
      return agentToolErrorResponse(queryParsed.body, queryParsed.status);
    }
    bodyRestaurantId = queryParsed.data.restaurant_id;
    queryRestaurantId = queryParsed.data.restaurant_id ?? null;
    restaurantNameHint = queryParsed.data.restaurant_name ?? null;
  } else if (req.method === "POST") {
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return agentToolErrorResponse(
        {
          error: "invalid_json",
          code: "invalid_json",
          message: "Request body must be valid JSON.",
          recovery_hint: "Send Content-Type: application/json with a JSON object.",
        },
        400
      );
    }
    const bodyParsed = parseAgentToolRequest(GetMenuPostBodySchema, raw, {
      tool: "get_menu_items",
    });
    if (!bodyParsed.ok) {
      return agentToolErrorResponse(bodyParsed.body, bodyParsed.status);
    }
    bodyRestaurantId = bodyParsed.data.restaurant_id;
    queryRestaurantId = bodyParsed.data.restaurant_id ?? null;
    restaurantNameHint = bodyParsed.data.restaurant_name ?? null;
  } else {
    return agentToolErrorResponse(
      {
        error: "method_not_allowed",
        code: "method_not_allowed",
        message: "Use GET or POST.",
      },
      405
    );
  }

  const auth = await authenticateAgentToolRequest(
    req,
    bodyRestaurantId,
    queryRestaurantId
  );
  if (!auth.ok) {
    return agentToolErrorResponse(auth.body, auth.status);
  }

  const scopeCheck = assertRestaurantIdMatches(bodyRestaurantId, auth.restaurantId);
  if (!scopeCheck.ok) {
    return agentToolErrorResponse(scopeCheck.body, scopeCheck.status);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return agentToolErrorResponse(
      {
        error: "misconfigured",
        code: "misconfigured",
        message: "Server misconfigured.",
      },
      500
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const restaurantId = auth.restaurantId;
  const organizationId = await resolveRestaurantOrganizationId(
    supabase,
    restaurantId
  );
  const meter = createAgentToolMeter(supabase, {
    organizationId,
    restaurantId,
    tool: "get_menu_items",
  });

  const ownership = await assertRestaurantToolOwnership(supabase, auth.restaurantId, auth);
  if (!ownership.ok) {
    meter(ownership.status);
    return agentToolErrorResponse(ownership.body, ownership.status);
  }

  const { data: restaurant, error: rErr } = await supabase
    .from("restaurants")
    .select("id, name, created_at")
    .eq("id", restaurantId)
    .maybeSingle();

  if (rErr) {
    meter(500);
    return agentToolErrorResponse(
      { error: "database_error", code: "database_error", message: rErr.message },
      500
    );
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

  let operations: Record<string, unknown> = {
    ordering_allowed: true,
    is_open_now: true,
    status: "open",
    message: "Hours not configured.",
  };
  try {
    const hours = await loadHoursForRestaurant(supabase, restaurantId);
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

  const { data: categories, error: cErr } = await supabase
    .from("categories")
    .select("id, name, sort_order")
    .eq("restaurant_id", restaurantId)
    .order("sort_order", { ascending: true });

  if (cErr) {
    meter(500);
    return agentToolErrorResponse(
      { error: "database_error", code: "database_error", message: cErr.message },
      500
    );
  }

  const cats = categories ?? [];
  const categoryIds = cats.map((c) => c.id as string);

  let nested: unknown[] = [];
  if (categoryIds.length > 0) {
    const { data: items, error: iErr } = await supabase
      .from("items")
      .select("id, category_id, name, description, price, is_available")
      .in("category_id", categoryIds)
      .order("name", { ascending: true });

    if (iErr) {
      meter(500);
      return agentToolErrorResponse(
        { error: "database_error", code: "database_error", message: iErr.message },
        500
      );
    }

    const itemList = items ?? [];
    const itemIds = itemList.map((i) => i.id as string);
    const modifiersByItem: Record<string, unknown[]> = {};

    if (itemIds.length > 0) {
      const { data: mods, error: mErr } = await supabase
        .from("modifiers")
        .select(
          "id, item_id, group_name, modifier_name, extra_price, min_selection, max_selection"
        )
        .in("item_id", itemIds);

      if (mErr) {
        meter(500);
        return agentToolErrorResponse(
          { error: "database_error", code: "database_error", message: mErr.message },
          500
        );
      }
      for (const m of mods ?? []) {
        const iid = m.item_id as string;
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
          modifiers: modifiersByItem[it.id as string] ?? [],
        })),
    }));
  }

  const { data: profileRow, error: profileErr } = await supabase
    .from("restaurant_profiles")
    .select("allows_pickup, allows_delivery")
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (profileErr) {
    meter(500);
    return agentToolErrorResponse(
      { error: "database_error", code: "database_error", message: profileErr.message },
      500
    );
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

  const validated = parseAgentToolResponse(GetMenuResponseSchema, responseBody, {
    tool: "get_menu_items",
  });
  if (!validated.ok) {
    meter(validated.status);
    return agentToolErrorResponse(validated.body, validated.status);
  }

  meter(
    200,
    {
      lineCount: validated.data.categories.reduce((n, c) => n + c.items.length, 0),
    }
  );

  return agentToolJsonResponse(validated.data);
});
