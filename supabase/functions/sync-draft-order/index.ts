import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { loadHoursForRestaurant } from "../_shared/restaurant-hours.ts";
import {
  assertRestaurantToolOwnership,
  authenticateAgentToolRequest,
  readIdempotencyKey,
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
  SyncDraftOrderRequestSchema,
  SyncDraftOrderResponseSchema,
} from "../_shared/agent-tool-zod.ts";
import {
  loadIdempotentResponse,
  storeIdempotentResponse,
} from "../_shared/idempotency.ts";
import { loadRestaurantMenuForValidation } from "../_shared/load-restaurant-menu.ts";
import {
  cartLinesForStorage,
  formatCartValidationError,
  formatFulfillmentValidationError,
  validateCartForSync,
  validateFulfillmentForOrder,
} from "../_shared/order-validate.ts";
import { loadFulfillmentServiceModes } from "../_shared/load-fulfillment-profile.ts";
import { coerceSyncDraftOrderStatus } from "../_shared/order-status.ts";
import { assertVoiceOrderBillingGate } from "../_shared/billing-gate.ts";
import {
  createAgentToolMeter,
  resolveRestaurantOrganizationId,
} from "../_shared/record-usage.ts";

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

  const parsed = parseAgentToolRequest(SyncDraftOrderRequestSchema, raw, {
    tool: "sync_draft_order",
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

  const ownership = await assertRestaurantToolOwnership(
    supabase,
    auth.restaurantId,
    auth
  );
  if (!ownership.ok) {
    createAgentToolMeter(supabase, {
      organizationId,
      restaurantId,
      sessionId: parsed.data.session_id,
      tool: "sync_draft_order",
    })(ownership.status);
    return agentToolErrorResponse(ownership.body, ownership.status);
  }

  let meter = createAgentToolMeter(supabase, {
    organizationId,
    restaurantId,
    sessionId: parsed.data.session_id,
    tool: "sync_draft_order",
  });

  if (organizationId) {
    const billingGate = await assertVoiceOrderBillingGate(
      supabase,
      organizationId
    );
    if (!billingGate.ok) {
      meter(billingGate.status);
      return agentToolErrorResponse(billingGate.body, billingGate.status);
    }
  }
  const idempotencyParsed = readIdempotencyKey(req, raw as Record<string, unknown>);
  if (!idempotencyParsed.ok) {
    return agentToolErrorResponse(idempotencyParsed.body, idempotencyParsed.status);
  }
  const idempotencyKey =
    parsed.data.idempotency_key ?? idempotencyParsed.key;

  let skippedMeteringForReplay = false;
  if (idempotencyKey) {
    const cached = await loadIdempotentResponse(
      supabase,
      restaurantId,
      idempotencyKey,
      "sync_draft_order"
    );
    if (cached) {
      skippedMeteringForReplay = true;
      return agentToolJsonResponse(cached.body, cached.httpStatus, {
        "x-roal-idempotent-replay": "true",
      });
    }
  }

  meter = createAgentToolMeter(supabase, {
    organizationId,
    restaurantId,
    sessionId: parsed.data.session_id,
    tool: "sync_draft_order",
    skipMetering: skippedMeteringForReplay,
  });

  try {
    const hours = await loadHoursForRestaurant(supabase, restaurantId);
    if (!hours.evaluation.ordering_allowed) {
      meter(403);
      return agentToolErrorResponse(
        {
          error: "restaurant_closed",
          code: "restaurant_closed",
          message: hours.evaluation.message,
          recovery_hint:
            "Do not call sync_draft_order or finalize_order while closed. Offer to call back during open hours.",
          operations: {
            ordering_allowed: false,
            status: hours.evaluation.status,
            message: hours.evaluation.message,
          },
        },
        403
      );
    }
  } catch {
    // Allow orders if hours data is unavailable.
  }

  let menu;
  try {
    menu = await loadRestaurantMenuForValidation(supabase, restaurantId);
  } catch (e) {
    meter(500);
    return agentToolErrorResponse(
      {
        error: "database_error",
        code: "database_error",
        message: e instanceof Error ? e.message : "Failed to load menu",
      },
      500
    );
  }

  const cartValidation = validateCartForSync(
    parsed.data.items,
    menu.items,
    menu.modifiers
  );
  if (!cartValidation.ok) {
    meter(422, { lineCount: 0 });
    return agentToolErrorResponse(
      formatCartValidationError(cartValidation, "sync_draft_order"),
      422
    );
  }

  let serviceModes;
  try {
    serviceModes = await loadFulfillmentServiceModes(supabase, restaurantId);
  } catch (e) {
    meter(500);
    return agentToolErrorResponse(
      {
        error: "database_error",
        code: "database_error",
        message: e instanceof Error ? e.message : "Failed to load profile",
      },
      500
    );
  }

  const hasCartLines = cartValidation.normalizedItems.length > 0;
  const requestedFulfillment =
    parsed.data.fulfillment_type ??
    (hasCartLines ? "pickup" : null);

  if (hasCartLines || parsed.data.fulfillment_type) {
    const fulfillmentCheck = validateFulfillmentForOrder({
      allowsPickup: serviceModes.allowsPickup,
      allowsDelivery: serviceModes.allowsDelivery,
      fulfillmentType: requestedFulfillment,
      deliveryAddress: parsed.data.delivery_address ?? null,
      requireDeliveryAddress: false,
    });
    if (!fulfillmentCheck.ok) {
      meter(422, { lineCount: cartValidation.normalizedItems.length });
      return agentToolErrorResponse(
        formatFulfillmentValidationError(
          fulfillmentCheck.issue,
          "sync_draft_order"
        ),
        422
      );
    }
  }

  const storedStatus = coerceSyncDraftOrderStatus(parsed.data.status);
  const row: Record<string, unknown> = {
    restaurant_id: restaurantId,
    session_id: parsed.data.session_id,
    status: storedStatus,
    items: cartLinesForStorage(cartValidation.normalizedItems),
    updated_at: new Date().toISOString(),
  };
  if (parsed.data.customer_name) row.customer_name = parsed.data.customer_name;
  if (parsed.data.customer_phone) row.customer_phone = parsed.data.customer_phone;
  if (parsed.data.fulfillment_type) {
    row.fulfillment_type = parsed.data.fulfillment_type;
  }
  if (parsed.data.delivery_address) {
    row.delivery_address = parsed.data.delivery_address;
  }
  if (parsed.data.delivery_instructions) {
    row.delivery_instructions = parsed.data.delivery_instructions;
  }

  const { data, error } = await supabase
    .from("draft_orders")
    .upsert(row, { onConflict: "restaurant_id,session_id" })
    .select()
    .single();

  if (error) {
    meter(500);
    return agentToolErrorResponse(
      { error: "database_error", code: "database_error", message: error.message },
      500
    );
  }

  const responseBody = { ok: true as const, draft_order: data };
  const validated = parseAgentToolResponse(SyncDraftOrderResponseSchema, responseBody, {
    tool: "sync_draft_order",
  });
  if (!validated.ok) {
    meter(validated.status);
    return agentToolErrorResponse(validated.body, validated.status);
  }

  if (idempotencyKey) {
    await storeIdempotentResponse(supabase, {
      restaurantId,
      idempotencyKey,
      toolName: "sync_draft_order",
      httpStatus: 200,
      body: validated.data,
    });
  }

  meter(200, {
    lineCount: cartValidation.normalizedItems.length,
    recordVoiceOrder: cartValidation.normalizedItems.length > 0,
    orderStatus: storedStatus,
  });

  return agentToolJsonResponse(validated.data);
});
