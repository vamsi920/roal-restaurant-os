import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }
  if (!requireAuth(req)) return unauthorized();

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const fromHeader = req.headers.get("x-roal-restaurant-id")?.trim() ?? "";
  const fromBody = body.restaurant_id;
  const restaurantId =
    typeof fromBody === "string" && UUID_RE.test(fromBody)
      ? fromBody
      : fromHeader && UUID_RE.test(fromHeader)
        ? fromHeader
        : null;
  const sessionId = body.session_id;
  const customerName = body.customer_name;
  const customerPhone = body.customer_phone;
  const items = body.items;

  if (typeof restaurantId !== "string" || !UUID_RE.test(restaurantId)) {
    return jsonResponse(
      {
        error:
          "restaurant_id must be a uuid (JSON body or x-roal-restaurant-id header)",
      },
      400
    );
  }
  if (typeof sessionId !== "string" || sessionId.length < 1) {
    return jsonResponse({ error: "session_id is required" }, 400);
  }
  if (sessionId.length > 512) {
    return jsonResponse({ error: "session_id too long (max 512)" }, 400);
  }
  if (typeof customerName !== "string" || customerName.trim().length < 1) {
    return jsonResponse({ error: "customer_name is required" }, 400);
  }
  if (typeof customerPhone !== "string" || customerPhone.trim().length < 1) {
    return jsonResponse({ error: "customer_phone is required" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return jsonResponse({ error: "Server misconfigured" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: exists, error: e0 } = await supabase
    .from("restaurants")
    .select("id")
    .eq("id", restaurantId)
    .maybeSingle();

  if (e0) return jsonResponse({ error: e0.message }, 500);
  if (!exists) return jsonResponse({ error: "Restaurant not found" }, 404);

  let finalItems: unknown[] = [];
  if (Array.isArray(items)) {
    finalItems = items as unknown[];
  } else {
    const { data: cur, error: e1 } = await supabase
      .from("draft_orders")
      .select("items")
      .eq("restaurant_id", restaurantId)
      .eq("session_id", sessionId)
      .maybeSingle();
    if (e1) return jsonResponse({ error: e1.message }, 500);
    if (cur?.items && Array.isArray(cur.items)) {
      finalItems = cur.items as unknown[];
    }
  }

  if (finalItems.length === 0) {
    return jsonResponse(
      { error: "No line items: call sync_draft_order first or pass items[]" },
      400
    );
  }

  const row = {
    restaurant_id: restaurantId,
    session_id: sessionId,
    status: "confirmed" as const,
    items: finalItems,
    customer_name: customerName.trim(),
    customer_phone: customerPhone.trim(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("draft_orders")
    .upsert(row, { onConflict: "restaurant_id,session_id" })
    .select()
    .single();

  if (error) return jsonResponse({ error: error.message }, 500);

  const receiptRow = {
    restaurant_id: restaurantId,
    session_id: sessionId,
    items: finalItems,
    customer_name: customerName.trim(),
    customer_phone: customerPhone.trim(),
  };
  const { error: recErr } = await supabase
    .from("phone_order_receipts")
    .upsert(receiptRow, { onConflict: "restaurant_id,session_id" });

  if (recErr) {
    const msg = recErr.message ?? "";
    if (
      /phone_order_receipts/i.test(msg) &&
      /does not exist|schema cache|Could not find the table/i.test(msg)
    ) {
      return jsonResponse({
        ok: true,
        draft_order: data,
        receipt_skipped: true,
      });
    }
    return jsonResponse({ error: recErr.message }, 500);
  }

  return jsonResponse({ ok: true, draft_order: data });
});
