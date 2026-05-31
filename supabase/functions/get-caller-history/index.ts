import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
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
  GetCallerHistoryRequestSchema,
  GetCallerHistoryResponseSchema,
  parseAgentToolRequest,
  parseAgentToolResponse,
} from "../_shared/agent-tool-zod.ts";
import {
  createAgentToolMeter,
  resolveRestaurantOrganizationId,
} from "../_shared/record-usage.ts";

type JsonRecord = Record<string, unknown>;

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function phoneDigits(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

function phoneMatchKey(value: string | null | undefined): string {
  const digits = phoneDigits(value);
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

function scopedReceipts(
  rows: JsonRecord[],
  restaurantId: string
): JsonRecord[] {
  return rows.filter((row) => asString(row.restaurant_id) === restaurantId);
}

function itemNames(items: unknown): string[] {
  if (!Array.isArray(items)) return [];
  const names: string[] = [];
  for (const item of items) {
    const row = item && typeof item === "object" ? (item as JsonRecord) : {};
    const name = asString(row.name);
    if (name) names.push(name);
  }
  return names;
}

function topFavoriteItems(rows: JsonRecord[]): string[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    for (const name of itemNames(row.items)) {
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([name]) => name);
}

function historyMessage(found: boolean, names: string[], count: number): string {
  if (!found) {
    return "No prior completed pickup order was found for this restaurant. Treat the caller as a new guest.";
  }
  const itemText = names.length ? ` Last order included ${names.slice(0, 3).join(", ")}.` : "";
  return `Returning guest with ${count} completed pickup order${count === 1 ? "" : "s"} here.${itemText} You may mention you can help with their usual, but do not assume they want it.`;
}

function summarizeHistory(rows: JsonRecord[]) {
  const first = rows[0] ?? null;
  const lastItems = itemNames(first?.items);
  return {
    found: Boolean(first),
    customer_name: first ? asString(first.customer_name) || null : null,
    customer_phone: first ? asString(first.customer_phone) || null : null,
    visit_count: rows.length,
    completed_order_count: rows.length,
    last_order_at: first ? asString(first.created_at) || null : null,
    last_order_items: lastItems,
    favorite_items: topFavoriteItems(rows),
    message: historyMessage(Boolean(first), lastItems, rows.length),
  };
}

async function findCallerReceipts(
  supabase: ReturnType<typeof createClient>,
  restaurantId: string,
  input: {
    customer_phone?: string;
    customer_name?: string;
  }
): Promise<JsonRecord[]> {
  const select =
    "id, restaurant_id, session_id, items, customer_name, customer_phone, created_at";

  if (input.customer_phone) {
    const targetKey = phoneMatchKey(input.customer_phone);
    if (targetKey.length >= 10) {
      const { data, error } = await supabase
        .from("phone_order_receipts")
        .select(select)
        .eq("restaurant_id", restaurantId)
        .not("customer_phone", "is", null)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      const rows = scopedReceipts(
        (Array.isArray(data) ? data : []) as JsonRecord[],
        restaurantId
      );
      const exact = rows.filter(
        (row) => phoneMatchKey(asString(row.customer_phone)) === targetKey
      );
      if (exact.length > 0) return exact.slice(0, 10);
    }
  }

  if (input.customer_name) {
    const { data, error } = await supabase
      .from("phone_order_receipts")
      .select(select)
      .eq("restaurant_id", restaurantId)
      .ilike("customer_name", input.customer_name)
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) throw error;
    return scopedReceipts(
      (Array.isArray(data) ? data : []) as JsonRecord[],
      restaurantId
    );
  }

  return [];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return agentToolErrorResponse(
      {
        error: "method_not_allowed",
        code: "method_not_allowed",
        message: "Use POST.",
      },
      405
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return agentToolErrorResponse(
      {
        error: "invalid_json",
        code: "invalid_json",
        message: "Request body must be valid JSON.",
        recovery_hint: "Send Content-Type: application/json.",
      },
      400
    );
  }

  const parsed = parseAgentToolRequest(GetCallerHistoryRequestSchema, raw, {
    tool: "get_caller_history",
  });
  if (!parsed.ok) {
    return agentToolErrorResponse(parsed.body, parsed.status);
  }

  const auth = await authenticateAgentToolRequest(req, parsed.data.restaurant_id);
  if (!auth.ok) {
    return agentToolErrorResponse(auth.body, auth.status);
  }

  const scopeCheck = assertRestaurantIdMatches(
    parsed.data.restaurant_id,
    auth.restaurantId
  );
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
    tool: "get_caller_history",
  });

  const ownership = await assertRestaurantToolOwnership(
    supabase,
    restaurantId,
    auth
  );
  if (!ownership.ok) {
    meter(ownership.status);
    return agentToolErrorResponse(ownership.body, ownership.status);
  }

  let rows: JsonRecord[] = [];
  try {
    rows = await findCallerReceipts(supabase, restaurantId, {
      customer_phone: parsed.data.customer_phone,
      customer_name: parsed.data.customer_name,
    });
  } catch (e) {
    console.error("[get-caller-history] lookup failed", e);
    meter(500);
    return agentToolErrorResponse(
      {
        error: "database_error",
        code: "database_error",
        message: "Could not look up caller history.",
        recovery_hint: "Treat as a new guest and continue the order.",
      },
      500
    );
  }

  const body = {
    ok: true as const,
    caller: summarizeHistory(rows),
  };
  const validated = parseAgentToolResponse(
    GetCallerHistoryResponseSchema,
    body,
    { tool: "get_caller_history" }
  );
  if (!validated.ok) {
    meter(validated.status);
    return agentToolErrorResponse(validated.body, validated.status);
  }

  meter(200);
  return agentToolJsonResponse(validated.data);
});
