import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, content-type, x-client-info, apikey, x-roal-restaurant-id",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function unauthorized(): Response {
  return jsonResponse({ error: "Unauthorized" }, 401);
}

function requireAuth(req: Request): boolean {
  const secret = Deno.env.get("AGENT_TOOL_SECRET");
  if (!secret) return false;
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  return token.length > 0 && token === secret;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!requireAuth(req)) return unauthorized();

  let restaurantId: string | null = null;
  let restaurantNameFromQuery: string | null = null;
  if (req.method === "GET") {
    const url = new URL(req.url);
    restaurantId =
      url.searchParams.get("restaurant_id") ??
      req.headers.get("x-roal-restaurant-id");
    restaurantNameFromQuery = url.searchParams.get("restaurant_name");
  } else if (req.method === "POST") {
    try {
      const body = (await req.json()) as {
        restaurant_id?: string;
        restaurant_name?: string;
      };
      restaurantId =
        typeof body.restaurant_id === "string" ? body.restaurant_id : null;
      restaurantNameFromQuery =
        typeof body.restaurant_name === "string" ? body.restaurant_name : null;
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }
  } else {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  if (!restaurantId || !UUID_RE.test(restaurantId)) {
    return jsonResponse(
      { error: "restaurant_id is required (uuid), query or JSON body" },
      400
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return jsonResponse({ error: "Server misconfigured" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: restaurant, error: rErr } = await supabase
    .from("restaurants")
    .select("id, name, created_at")
    .eq("id", restaurantId)
    .maybeSingle();

  if (rErr) return jsonResponse({ error: rErr.message }, 500);
  if (!restaurant) return jsonResponse({ error: "Restaurant not found" }, 404);

  const { data: categories, error: cErr } = await supabase
    .from("categories")
    .select("id, name, sort_order")
    .eq("restaurant_id", restaurantId)
    .order("sort_order", { ascending: true });

  if (cErr) return jsonResponse({ error: cErr.message }, 500);

  const cats = categories ?? [];
  const categoryIds = cats.map((c) => c.id as string);
  if (categoryIds.length === 0) {
    return jsonResponse({
      restaurant,
      categories: [],
      restaurant_name_hint: restaurantNameFromQuery,
    });
  }

  const { data: items, error: iErr } = await supabase
    .from("items")
    .select("id, category_id, name, description, price, is_available")
    .in("category_id", categoryIds)
    .order("name", { ascending: true });

  if (iErr) return jsonResponse({ error: iErr.message }, 500);

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

    if (mErr) return jsonResponse({ error: mErr.message }, 500);
    for (const m of mods ?? []) {
      const iid = m.item_id as string;
      if (!modifiersByItem[iid]) modifiersByItem[iid] = [];
      modifiersByItem[iid].push(m);
    }
  }

  const nested = cats.map((cat) => ({
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
        is_available: it.is_available,
        modifiers: modifiersByItem[it.id as string] ?? [],
      })),
  }));

  return jsonResponse({
    restaurant,
    categories: nested,
    restaurant_name_hint: restaurantNameFromQuery,
  });
});
