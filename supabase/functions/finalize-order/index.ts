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
  FinalizeOrderRequestSchema,
  FinalizeOrderResponseSchema,
  parseAgentToolRequest,
  parseAgentToolResponse,
} from "../_shared/agent-tool-zod.ts";
import {
  loadIdempotentResponse,
  storeIdempotentResponse,
} from "../_shared/idempotency.ts";
import { loadRestaurantMenuForValidation } from "../_shared/load-restaurant-menu.ts";
import {
  cartLinesForStorage,
  formatCartValidationError,
  formatCustomerValidationError,
  formatFulfillmentValidationError,
  validateCartForFinalize,
  validateCustomerForFinalize,
  validateFulfillmentForOrder,
} from "../_shared/order-validate.ts";
import { loadFulfillmentServiceModes } from "../_shared/load-fulfillment-profile.ts";
import { FINALIZE_ORDER_STATUS } from "../_shared/order-status.ts";
import { assertVoiceOrderBillingGate } from "../_shared/billing-gate.ts";
import { markAgentCallOrderCompleted } from "../_shared/mark-call-order-completed.ts";
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

  const parsed = parseAgentToolRequest(FinalizeOrderRequestSchema, raw, {
    tool: "finalize_order",
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
      tool: "finalize_order",
    })(ownership.status);
    return agentToolErrorResponse(ownership.body, ownership.status);
  }

  let meter = createAgentToolMeter(supabase, {
    organizationId,
    restaurantId,
    sessionId: parsed.data.session_id,
    tool: "finalize_order",
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
      "finalize_order"
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
    tool: "finalize_order",
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
          recovery_hint: "Cannot finalize while the restaurant is closed for orders.",
        },
        403
      );
    }
  } catch {
    // Allow orders if hours data is unavailable.
  }

  const customerCheck = validateCustomerForFinalize(
    parsed.data.customer_name,
    parsed.data.customer_phone
  );
  if (!customerCheck.ok) {
    meter(400);
    return agentToolErrorResponse(
      formatCustomerValidationError(customerCheck.issues),
      400
    );
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

  let rawItems: unknown;
  let draftFulfillmentType: string | null = null;
  let draftDeliveryAddress: string | null = null;
  let draftDeliveryInstructions: string | null = null;
  if (parsed.data.items) {
    rawItems = parsed.data.items;
  } else {
    const { data: cur, error: e1 } = await supabase
      .from("draft_orders")
      .select("items, fulfillment_type, delivery_address, delivery_instructions")
      .eq("restaurant_id", restaurantId)
      .eq("session_id", parsed.data.session_id)
      .maybeSingle();
    if (e1) {
      meter(500);
      return agentToolErrorResponse(
        { error: "database_error", code: "database_error", message: e1.message },
        500
      );
    }
    rawItems = cur?.items;
    draftFulfillmentType =
      typeof cur?.fulfillment_type === "string" ? cur.fulfillment_type : null;
    draftDeliveryAddress =
      typeof cur?.delivery_address === "string" ? cur.delivery_address : null;
    draftDeliveryInstructions =
      typeof cur?.delivery_instructions === "string"
        ? cur.delivery_instructions
        : null;
  }

  const cartValidation = validateCartForFinalize(
    rawItems,
    menu.items,
    menu.modifiers
  );
  if (!cartValidation.ok) {
    meter(422, { lineCount: 0 });
    return agentToolErrorResponse(
      formatCartValidationError(cartValidation, "finalize_order"),
      422
    );
  }

  const storedItems = cartLinesForStorage(cartValidation.normalizedItems);
  const fulfillmentType =
    parsed.data.fulfillment_type ?? draftFulfillmentType ?? "pickup";
  const deliveryAddress =
    parsed.data.delivery_address ?? draftDeliveryAddress ?? null;
  const deliveryInstructions =
    parsed.data.delivery_instructions ?? draftDeliveryInstructions ?? null;

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

  const fulfillmentCheck = validateFulfillmentForOrder({
    allowsPickup: serviceModes.allowsPickup,
    allowsDelivery: serviceModes.allowsDelivery,
    fulfillmentType,
    deliveryAddress,
    requireDeliveryAddress: true,
  });
  if (!fulfillmentCheck.ok) {
    meter(400, { lineCount: storedItems.length });
    return agentToolErrorResponse(
      formatFulfillmentValidationError(
        fulfillmentCheck.issue,
        "finalize_order"
      ),
      fulfillmentCheck.issue.code === "missing_delivery_address" ? 400 : 422
    );
  }

  const resolvedFulfillmentType = fulfillmentCheck.fulfillmentType;

  const row = {
    restaurant_id: restaurantId,
    session_id: parsed.data.session_id,
    status: FINALIZE_ORDER_STATUS,
    items: storedItems,
    customer_name: customerCheck.customer_name,
    customer_phone: customerCheck.customer_phone,
    fulfillment_type: resolvedFulfillmentType,
    delivery_address: deliveryAddress,
    delivery_instructions: deliveryInstructions,
    updated_at: new Date().toISOString(),
  };

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

  const receiptRow = {
    restaurant_id: restaurantId,
    session_id: parsed.data.session_id,
    items: storedItems,
    customer_name: customerCheck.customer_name,
    customer_phone: customerCheck.customer_phone,
    fulfillment_type: resolvedFulfillmentType,
    delivery_address: deliveryAddress,
    delivery_instructions: deliveryInstructions,
  };
  const { error: recErr } = await supabase
    .from("phone_order_receipts")
    .upsert(receiptRow, { onConflict: "restaurant_id,session_id" });

  let responseBody: Record<string, unknown> = { ok: true, draft_order: data };
  if (recErr) {
    const msg = recErr.message ?? "";
    if (
      /phone_order_receipts/i.test(msg) &&
      /does not exist|schema cache|Could not find the table/i.test(msg)
    ) {
      responseBody = { ok: true, draft_order: data, receipt_skipped: true };
    } else {
      meter(500);
      return agentToolErrorResponse(
        { error: "database_error", code: "database_error", message: recErr.message },
        500
      );
    }
  }

  const validated = parseAgentToolResponse(
    FinalizeOrderResponseSchema,
    responseBody,
    { tool: "finalize_order" }
  );
  if (!validated.ok) {
    meter(validated.status);
    return agentToolErrorResponse(validated.body, validated.status);
  }

  try {
    await markAgentCallOrderCompleted(supabase, {
      restaurantId,
      sessionId: parsed.data.session_id,
    });
  } catch (markErr) {
    console.error("[finalize_order] markAgentCallOrderCompleted failed", markErr);
  }

  if (idempotencyKey) {
    await storeIdempotentResponse(supabase, {
      restaurantId,
      idempotencyKey,
      toolName: "finalize_order",
      httpStatus: 200,
      body: validated.data,
    });
  }

  meter(200, {
    lineCount: cartValidation.normalizedItems.length,
    recordOrderCompleted: true,
    orderStatus: FINALIZE_ORDER_STATUS,
  });

  return agentToolJsonResponse(validated.data);
});
