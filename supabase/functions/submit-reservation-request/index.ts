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
  parseAgentToolRequest,
  parseAgentToolResponse,
  SubmitReservationRequestSchema,
  SubmitReservationResponseSchema,
} from "../_shared/agent-tool-zod.ts";
import {
  createAgentToolMeter,
  resolveRestaurantOrganizationId,
} from "../_shared/record-usage.ts";
import {
  loadIdempotentResponse,
  storeIdempotentResponse,
} from "../_shared/idempotency.ts";

type JsonRecord = Record<string, unknown>;

const TOOL = "submit_reservation_request";
const PLACEHOLDER_PHONE_RE = /^(?:\+?1)?(?:555|000|123)[0-9\s().-]*$/;

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function validHumanPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return false;
  if (/^(\d)\1+$/.test(digits)) return false;
  if (PLACEHOLDER_PHONE_RE.test(phone)) return false;
  return true;
}

function reservationMessage(row: JsonRecord): string {
  return `Reservation request saved for ${row.party_size} guest${Number(row.party_size) === 1 ? "" : "s"} on ${row.requested_date} at ${row.requested_time}. Tell the caller this is a request, not a confirmed reservation, and staff will confirm.`;
}

function summarizeReservation(row: JsonRecord) {
  return {
    id: asString(row.id),
    restaurant_id: asString(row.restaurant_id),
    session_id: asString(row.session_id) || null,
    conversation_id: asString(row.conversation_id) || null,
    customer_name: asString(row.customer_name),
    customer_phone: asString(row.customer_phone),
    party_size: Number(row.party_size),
    requested_date: asString(row.requested_date),
    requested_time: asString(row.requested_time),
    notes: asString(row.notes) || null,
    status: asString(row.status) || "requested",
    created_at: asString(row.created_at),
    message: reservationMessage(row),
  };
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

  const parsed = parseAgentToolRequest(SubmitReservationRequestSchema, raw, {
    tool: TOOL,
  });
  if (!parsed.ok) {
    return agentToolErrorResponse(parsed.body, parsed.status);
  }

  if (!validHumanPhone(parsed.data.customer_phone)) {
    return agentToolErrorResponse(
      {
        error: "validation_failed",
        code: "invalid_customer_phone",
        message: "Reservation request requires a real callback phone.",
        recovery_hint:
          "Ask the guest for the best callback number, read it back, then submit the reservation request again.",
      },
      400
    );
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
  if (!organizationId) {
    return agentToolErrorResponse(
      {
        error: "restaurant_not_configured",
        code: "restaurant_not_configured",
        message: "Restaurant organization is missing.",
      },
      500
    );
  }
  const meter = createAgentToolMeter(supabase, {
    organizationId,
    restaurantId,
    sessionId: parsed.data.session_id,
    tool: TOOL,
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

  const idempotencyKey =
    parsed.data.idempotency_key ?? req.headers.get("x-roal-idempotency-key");
  if (idempotencyKey) {
    const cached = await loadIdempotentResponse(
      supabase,
      restaurantId,
      idempotencyKey,
      TOOL
    );
    if (cached) {
      meter(cached.httpStatus);
      return agentToolJsonResponse(cached.body, cached.httpStatus, {
        "x-roal-idempotent-replay": "true",
      });
    }
  }

  const row = {
    organization_id: organizationId,
    restaurant_id: restaurantId,
    session_id: parsed.data.session_id ?? null,
    conversation_id: parsed.data.conversation_id ?? parsed.data.session_id ?? null,
    customer_name: parsed.data.customer_name,
    customer_phone: parsed.data.customer_phone,
    party_size: parsed.data.party_size,
    requested_date: parsed.data.requested_date,
    requested_time: parsed.data.requested_time,
    notes: parsed.data.notes ?? null,
    status: "requested",
  };

  const { data, error } = await supabase
    .from("restaurant_reservation_requests")
    .insert(row)
    .select(
      "id, restaurant_id, session_id, conversation_id, customer_name, customer_phone, party_size, requested_date, requested_time, notes, status, created_at"
    )
    .single();

  if (error || !data) {
    console.error("[submit-reservation-request] insert failed", error);
    meter(500);
    return agentToolErrorResponse(
      {
        error: "database_error",
        code: "database_error",
        message: "Could not save the reservation request.",
        recovery_hint:
          "Apologize and offer staff follow-up by taking the guest's callback number.",
      },
      500
    );
  }

  const body = {
    ok: true as const,
    reservation_request: summarizeReservation(data as JsonRecord),
  };
  const validated = parseAgentToolResponse(
    SubmitReservationResponseSchema,
    body,
    { tool: TOOL }
  );
  if (!validated.ok) {
    meter(validated.status);
    return agentToolErrorResponse(validated.body, validated.status);
  }

  if (idempotencyKey) {
    await storeIdempotentResponse(supabase, {
      restaurantId,
      idempotencyKey,
      toolName: TOOL,
      httpStatus: 200,
      body: validated.data,
    });
  }

  meter(200);
  return agentToolJsonResponse(validated.data);
});
