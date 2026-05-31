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
  GetOrderStatusRequestSchema,
  GetOrderStatusResponseSchema,
  parseAgentToolRequest,
  parseAgentToolResponse,
} from "../_shared/agent-tool-zod.ts";
import {
  createAgentToolMeter,
  resolveRestaurantOrganizationId,
} from "../_shared/record-usage.ts";
import { buildCallerOrderStatusTimeline } from "../_shared/caller-status-timeline.ts";
import { normalizeOrderStatus } from "../_shared/order-status.ts";

type JsonRecord = Record<string, unknown>;

const STATUS_LABELS: Record<string, string> = {
  draft: "being taken",
  new: "received by the kitchen",
  accepted: "accepted by the kitchen",
  in_progress: "being prepared",
  ready: "ready for pickup",
  completed: "completed",
  canceled: "canceled",
};

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

function lineCount(items: unknown): number {
  if (!Array.isArray(items)) return 0;
  return items.reduce((sum, item) => {
    const row = item && typeof item === "object" ? (item as JsonRecord) : {};
    const quantity = Number(row.quantity ?? 1);
    return sum + (Number.isFinite(quantity) && quantity > 0 ? quantity : 1);
  }, 0);
}

function orderMessage(status: string | null, found: boolean): string {
  if (!found) {
    return "I could not find a recent matching pickup order. Please ask the guest for the phone number or name on the order, then try again.";
  }
  const normalized = normalizeOrderStatus(status);
  if (normalized === "draft") {
    return "That order is still being taken and has not reached the kitchen yet.";
  }
  if (normalized === "new") {
    return "That order has been received by the kitchen.";
  }
  if (normalized === "accepted") {
    return "That order has been accepted by the kitchen.";
  }
  if (normalized === "in_progress") {
    return "That order is being prepared.";
  }
  if (normalized === "ready") {
    return "That order is ready for pickup.";
  }
  if (normalized === "completed") {
    return "That order is marked completed.";
  }
  if (normalized === "canceled") {
    return "That order is marked canceled.";
  }
  return "I found the order, but its kitchen status is unclear.";
}

function summarizeOrder(row: JsonRecord | null) {
  const rawStatus = row ? asString(row.status) : "";
  const status = row ? normalizeOrderStatus(rawStatus) : null;
  return {
    found: Boolean(row),
    status,
    status_label: status ? STATUS_LABELS[status] ?? status : null,
    message: orderMessage(status, Boolean(row)),
    session_id: row ? asString(row.session_id) || null : null,
    customer_name: row ? asString(row.customer_name) || null : null,
    customer_phone: row ? asString(row.customer_phone) || null : null,
    item_count: row ? lineCount(row.items) : 0,
    updated_at: row ? asString(row.updated_at) || null : null,
    created_at: row ? asString(row.created_at) || null : null,
    status_timeline: row ? buildCallerOrderStatusTimeline(row) : [],
  };
}

async function findOrder(
  supabase: ReturnType<typeof createClient>,
  restaurantId: string,
  input: {
    session_id?: string;
    customer_phone?: string;
    customer_name?: string;
  }
): Promise<JsonRecord | null> {
  const select =
    "id, restaurant_id, session_id, status, items, customer_name, customer_phone, fulfillment_type, created_at, updated_at, accepted_at, in_progress_at, ready_at, completed_at, canceled_at";

  const scopedRow = (row: JsonRecord | null | undefined): JsonRecord | null => {
    if (!row) return null;
    if (asString(row.restaurant_id) !== restaurantId) return null;
    return row;
  };

  if (input.session_id) {
    const { data, error } = await supabase
      .from("draft_orders")
      .select(select)
      .eq("restaurant_id", restaurantId)
      .eq("session_id", input.session_id)
      .maybeSingle();
    if (error) throw error;
    const row = scopedRow(data as JsonRecord | null);
    if (row) return row;
  }

  if (input.customer_phone) {
    const targetKey = phoneMatchKey(input.customer_phone);
    if (targetKey.length >= 10) {
      const { data, error } = await supabase
        .from("draft_orders")
        .select(select)
        .eq("restaurant_id", restaurantId)
        .not("customer_phone", "is", null)
        .order("updated_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      const rows = (Array.isArray(data) ? data : []) as JsonRecord[];
      const match = rows.find(
        (row) => phoneMatchKey(asString(row.customer_phone)) === targetKey
      );
      const row = scopedRow(match);
      if (row) return row;
    }
  }

  if (input.customer_name) {
    const { data, error } = await supabase
      .from("draft_orders")
      .select(select)
      .eq("restaurant_id", restaurantId)
      .ilike("customer_name", input.customer_name)
      .order("updated_at", { ascending: false })
      .limit(1);
    if (error) throw error;
    const row = scopedRow(
      Array.isArray(data) && data[0] ? (data[0] as JsonRecord) : null
    );
    if (row) return row;
  }

  return null;
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

  const parsed = parseAgentToolRequest(GetOrderStatusRequestSchema, raw, {
    tool: "get_order_status",
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
    sessionId: parsed.data.session_id,
    tool: "get_order_status",
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

  let row: JsonRecord | null = null;
  try {
    row = await findOrder(supabase, restaurantId, {
      session_id: parsed.data.session_id,
      customer_phone: parsed.data.customer_phone,
      customer_name: parsed.data.customer_name,
    });
  } catch (error) {
    meter(500);
    return agentToolErrorResponse(
      {
        error: "database_error",
        code: "database_error",
        message: error instanceof Error ? error.message : "Failed to load order status.",
      },
      500
    );
  }

  const responseBody = {
    ok: true as const,
    order: summarizeOrder(row),
  };
  const validated = parseAgentToolResponse(
    GetOrderStatusResponseSchema,
    responseBody,
    { tool: "get_order_status" }
  );
  if (!validated.ok) {
    meter(validated.status);
    return agentToolErrorResponse(validated.body, validated.status);
  }

  meter(200);
  return agentToolJsonResponse(validated.data);
});
