import { getDb, type Db } from "@/lib/db";
import {
  assertRestaurantIdMatches,
  parseAgentToolRequest,
  parseAgentToolResponse,
  SyncDraftOrderRequestSchema,
  SyncDraftOrderResponseSchema,
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
  formatFulfillmentValidationError,
  validateCartForSync,
  validateFulfillmentForOrder,
} from "@/lib/agent-tools/server/order-validate";
import { createAgentToolMeter, resolveRestaurantOrganizationId } from "@/lib/agent-tools/server/record-usage";
import { loadHoursForRestaurant } from "@/lib/agent-tools/server/restaurant-hours";
import { coerceSyncDraftOrderStatus } from "@/lib/order-status";

const TOOL = "sync_draft_order" as const;

/** sync_draft_order — POST. Upserts the live cart for (restaurant_id, session_id). */
export async function handleSyncDraftOrder(req: Request, db: Db = getDb()): Promise<Response> {
  if (req.method !== "POST") return methodNotAllowedResponse("Use POST.");

  const body = await readJsonBody(req);
  if (!body.ok) return agentToolErrorResponse(INVALID_JSON_BODY, 400);
  const raw = body.raw;

  const parsed = parseAgentToolRequest(SyncDraftOrderRequestSchema, raw, { tool: TOOL });
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
    menu = await loadRestaurantMenuForValidation(db, restaurantId);
  } catch (e) {
    meter(500);
    return databaseErrorResponse(e instanceof Error ? e.message : "Failed to load menu");
  }

  const cartValidation = validateCartForSync(parsed.data.items, menu.items, menu.modifiers);
  if (!cartValidation.ok) {
    meter(422, { lineCount: 0 });
    return agentToolErrorResponse(formatCartValidationError(cartValidation, TOOL), 422);
  }

  let serviceModes;
  try {
    serviceModes = await loadFulfillmentServiceModes(db, restaurantId);
  } catch (e) {
    meter(500);
    return databaseErrorResponse(e instanceof Error ? e.message : "Failed to load profile");
  }

  const hasCartLines = cartValidation.normalizedItems.length > 0;
  const requestedFulfillment = parsed.data.fulfillment_type ?? (hasCartLines ? "pickup" : null);

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
      return agentToolErrorResponse(formatFulfillmentValidationError(fulfillmentCheck.issue, TOOL), 422);
    }
  }

  const storedStatus = coerceSyncDraftOrderStatus(parsed.data.status);
  const row: Record<string, unknown> = {
    restaurant_id: restaurantId,
    session_id: sessionId,
    status: storedStatus,
    items: cartLinesForStorage(cartValidation.normalizedItems),
    updated_at: new Date().toISOString(),
  };
  if (parsed.data.customer_name) row.customer_name = parsed.data.customer_name;
  if (parsed.data.customer_phone) row.customer_phone = parsed.data.customer_phone;
  if (parsed.data.fulfillment_type) row.fulfillment_type = parsed.data.fulfillment_type;
  if (parsed.data.delivery_address) row.delivery_address = parsed.data.delivery_address;
  if (parsed.data.delivery_instructions) row.delivery_instructions = parsed.data.delivery_instructions;

  const { data, error } = await db
    .from("draft_orders")
    .upsert(row, { onConflict: "restaurant_id,session_id" })
    .select()
    .single();

  if (error) {
    meter(500);
    return databaseErrorResponse(error.message);
  }

  const validated = parseAgentToolResponse(
    SyncDraftOrderResponseSchema,
    { ok: true as const, draft_order: data },
    { tool: TOOL }
  );
  if (!validated.ok) {
    meter(validated.status);
    return agentToolErrorResponse(validated.body, validated.status);
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
    recordVoiceOrder: cartValidation.normalizedItems.length > 0,
    orderStatus: storedStatus,
  });

  return agentToolJsonResponse(validated.data);
}
