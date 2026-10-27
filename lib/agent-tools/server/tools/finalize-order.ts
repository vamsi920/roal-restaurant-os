import { markAgentCallOrderCompleted } from "@/lib/agent-calls/mark-call-order-completed";
import { getDb, type Db } from "@/lib/db";
import {
  assertRestaurantIdMatches,
  FinalizeOrderRequestSchema,
  FinalizeOrderResponseSchema,
  parseAgentToolRequest,
  parseAgentToolResponse,
} from "@/lib/agent-tools/schemas";
import {
  assertRestaurantToolOwnership,
  authenticateAgentToolRequest,
  readIdempotencyKey,
} from "@/lib/agent-tools/server/auth";
import { assertVoiceOrderBillingGate } from "@/lib/agent-tools/server/billing-gate";
import { loadIdempotentResponse, storeIdempotentResponse } from "@/lib/agent-tools/server/idempotency";
import {
  agentToolErrorResponse,
  agentToolJsonResponse,
  databaseErrorResponse,
  INVALID_JSON_BODY,
  methodNotAllowedResponse,
  readJsonBody,
} from "@/lib/agent-tools/server/json";
import { loadFulfillmentServiceModes, loadRestaurantMenuForValidation } from "@/lib/agent-tools/server/load-menu";
import {
  cartLinesForStorage,
  formatCartValidationError,
  formatCustomerValidationError,
  formatFulfillmentValidationError,
  validateCartForFinalize,
  validateCustomerForFinalize,
  validateFulfillmentForOrder,
} from "@/lib/agent-tools/server/order-validate";
import { createAgentToolMeter, resolveRestaurantOrganizationId } from "@/lib/agent-tools/server/record-usage";
import { loadHoursForRestaurant } from "@/lib/agent-tools/server/restaurant-hours";
import { FINALIZE_ORDER_STATUS } from "@/lib/order-status";

const TOOL = "finalize_order" as const;

/** finalize_order — POST. Confirms the cart, writes the receipt, marks the call order-completed. */
export async function handleFinalizeOrder(req: Request, db: Db = getDb()): Promise<Response> {
  if (req.method !== "POST") return methodNotAllowedResponse("Use POST.");

  const body = await readJsonBody(req);
  if (!body.ok) return agentToolErrorResponse(INVALID_JSON_BODY, 400);
  const raw = body.raw;

  const parsed = parseAgentToolRequest(FinalizeOrderRequestSchema, raw, { tool: TOOL });
  if (!parsed.ok) return agentToolErrorResponse(parsed.body, parsed.status);

  const auth = await authenticateAgentToolRequest(req, parsed.data.restaurant_id);
  if (!auth.ok) return agentToolErrorResponse(auth.body, auth.status);

  const scopeCheck = assertRestaurantIdMatches(parsed.data.restaurant_id, auth.restaurantId);
  if (!scopeCheck.ok) return agentToolErrorResponse(scopeCheck.body, scopeCheck.status);

  const restaurantId = auth.restaurantId;
  const sessionId = parsed.data.session_id;
  const organizationId = await resolveRestaurantOrganizationId(db, restaurantId);
  const meter = createAgentToolMeter(db, { organizationId, restaurantId, sessionId, tool: TOOL });

  const ownership = await assertRestaurantToolOwnership(db, restaurantId, auth);
  if (!ownership.ok) {
    meter(ownership.status);
    return agentToolErrorResponse(ownership.body, ownership.status);
  }

  if (organizationId) {
    const billingGate = await assertVoiceOrderBillingGate(db, organizationId);
    if (!billingGate.ok) {
      meter(billingGate.status);
      return agentToolErrorResponse(billingGate.body, billingGate.status);
    }
  }

  const idempotencyParsed = readIdempotencyKey(req, raw as Record<string, unknown>);
  if (!idempotencyParsed.ok) return agentToolErrorResponse(idempotencyParsed.body, idempotencyParsed.status);
  const idempotencyKey = parsed.data.idempotency_key ?? idempotencyParsed.key;

  if (idempotencyKey) {
    const cached = await loadIdempotentResponse(db, restaurantId, idempotencyKey, TOOL);
    if (cached) {
      // Replays are not metered again.
      return agentToolJsonResponse(cached.body, cached.httpStatus, { "x-roal-idempotent-replay": "true" });
    }
  }

  try {
    const hours = await loadHoursForRestaurant(db, restaurantId);
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

  const customerCheck = validateCustomerForFinalize(parsed.data.customer_name, parsed.data.customer_phone);
  if (!customerCheck.ok) {
    meter(400);
    return agentToolErrorResponse(formatCustomerValidationError(customerCheck.issues), 400);
  }

  let menu;
  try {
    menu = await loadRestaurantMenuForValidation(db, restaurantId);
  } catch (e) {
    meter(500);
    return databaseErrorResponse(e instanceof Error ? e.message : "Failed to load menu");
  }

  let rawItems: unknown;
  let draftFulfillmentType: string | null = null;
  let draftDeliveryAddress: string | null = null;
  let draftDeliveryInstructions: string | null = null;
  if (parsed.data.items) {
    rawItems = parsed.data.items;
  } else {
    const { data: cur, error: e1 } = await db
      .from("draft_orders")
      .select("items, fulfillment_type, delivery_address, delivery_instructions")
      .eq("restaurant_id", restaurantId)
      .eq("session_id", sessionId)
      .maybeSingle();
    if (e1) {
      meter(500);
      return databaseErrorResponse(e1.message);
    }
    rawItems = cur?.items;
    draftFulfillmentType = typeof cur?.fulfillment_type === "string" ? cur.fulfillment_type : null;
    draftDeliveryAddress = typeof cur?.delivery_address === "string" ? cur.delivery_address : null;
    draftDeliveryInstructions =
      typeof cur?.delivery_instructions === "string" ? cur.delivery_instructions : null;
  }

  const cartValidation = validateCartForFinalize(rawItems, menu.items, menu.modifiers);
  if (!cartValidation.ok) {
    meter(422, { lineCount: 0 });
    return agentToolErrorResponse(formatCartValidationError(cartValidation, TOOL), 422);
  }

  const storedItems = cartLinesForStorage(cartValidation.normalizedItems);
  const fulfillmentType = parsed.data.fulfillment_type ?? draftFulfillmentType ?? "pickup";
  const deliveryAddress = parsed.data.delivery_address ?? draftDeliveryAddress ?? null;
  const deliveryInstructions = parsed.data.delivery_instructions ?? draftDeliveryInstructions ?? null;

  let serviceModes;
  try {
    serviceModes = await loadFulfillmentServiceModes(db, restaurantId);
  } catch (e) {
    meter(500);
    return databaseErrorResponse(e instanceof Error ? e.message : "Failed to load profile");
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
      formatFulfillmentValidationError(fulfillmentCheck.issue, TOOL),
      fulfillmentCheck.issue.code === "missing_delivery_address" ? 400 : 422
    );
  }

  const resolvedFulfillmentType = fulfillmentCheck.fulfillmentType;

  const row = {
    restaurant_id: restaurantId,
    session_id: sessionId,
    status: FINALIZE_ORDER_STATUS,
    items: storedItems,
    customer_name: customerCheck.customer_name,
    customer_phone: customerCheck.customer_phone,
    fulfillment_type: resolvedFulfillmentType,
    delivery_address: deliveryAddress,
    delivery_instructions: deliveryInstructions,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await db
    .from("draft_orders")
    .upsert(row, { onConflict: "restaurant_id,session_id" })
    .select()
    .single();

  if (error) {
    meter(500);
    return databaseErrorResponse(error.message);
  }

  const receiptRow = {
    restaurant_id: restaurantId,
    session_id: sessionId,
    items: storedItems,
    customer_name: customerCheck.customer_name,
    customer_phone: customerCheck.customer_phone,
    fulfillment_type: resolvedFulfillmentType,
    delivery_address: deliveryAddress,
    delivery_instructions: deliveryInstructions,
  };
  const { error: recErr } = await db
    .from("phone_order_receipts")
    .upsert(receiptRow, { onConflict: "restaurant_id,session_id" });

  if (recErr) {
    meter(500);
    return databaseErrorResponse(recErr.message);
  }

  const validated = parseAgentToolResponse(
    FinalizeOrderResponseSchema,
    { ok: true, draft_order: data },
    { tool: TOOL }
  );
  if (!validated.ok) {
    meter(validated.status);
    return agentToolErrorResponse(validated.body, validated.status);
  }

  try {
    await markAgentCallOrderCompleted(db, { restaurantId, sessionId });
  } catch (markErr) {
    console.error("[finalize_order] markAgentCallOrderCompleted failed", markErr);
  }

  if (idempotencyKey) {
    await storeIdempotentResponse(db, {
      restaurantId,
      idempotencyKey,
      toolName: TOOL,
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
}
