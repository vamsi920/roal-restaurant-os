import { z } from "npm:zod@3.23.8";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const OptionalRestaurantIdSchema = z
  .string()
  .trim()
  .refine((v) => UUID_RE.test(v), "restaurant_id must be a valid UUID")
  .optional();

export const SessionIdSchema = z
  .string({ required_error: "session_id is required" })
  .trim()
  .min(1, "session_id is required")
  .max(512, "session_id must be at most 512 characters");

export const IdempotencyKeySchema = z
  .string()
  .trim()
  .min(1)
  .max(128, "idempotency_key must be at most 128 characters");

export const SyncDraftStatusSchema = z.enum(["draft", "confirmed"], {
  errorMap: () => ({ message: 'status must be "draft" or legacy "confirmed"' }),
});

export const FulfillmentTypeSchema = z.enum(["pickup", "delivery"], {
  errorMap: () => ({
    message: 'fulfillment_type must be "pickup" or "delivery"',
  }),
});

export const LineItemSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    item_id: z.string().trim().uuid("item_id must be a valid UUID").optional(),
    quantity: z.coerce.number().int().min(1).max(99).default(1),
    customizations: z.array(z.string().trim().min(1).max(120)).max(30).optional(),
    notes: z.string().trim().max(500).optional(),
  })
  .strict()
  .refine((line) => Boolean(line.name?.length || line.item_id), {
    message: "Each line item needs name or item_id",
    path: ["name"],
  });

export const GetMenuQuerySchema = z
  .object({
    restaurant_id: OptionalRestaurantIdSchema,
    restaurant_name: z.string().trim().max(200).optional(),
  })
  .strict();

export const GetMenuPostBodySchema = z
  .object({
    restaurant_id: OptionalRestaurantIdSchema,
    restaurant_name: z.string().trim().max(200).optional(),
  })
  .strict();

export const GetRestaurantInfoQuerySchema = GetMenuQuerySchema;
export const GetRestaurantInfoPostBodySchema = GetMenuPostBodySchema;

export const SyncDraftOrderRequestSchema = z
  .object({
    restaurant_id: OptionalRestaurantIdSchema,
    session_id: SessionIdSchema,
    status: SyncDraftStatusSchema,
    items: z.array(LineItemSchema).max(100, "items cannot exceed 100 lines"),
    customer_name: z.string().trim().min(1).max(200).optional(),
    customer_phone: z.string().trim().min(1).max(40).optional(),
    fulfillment_type: FulfillmentTypeSchema.optional(),
    delivery_address: z.string().trim().min(1).max(500).optional(),
    delivery_instructions: z.string().trim().min(1).max(500).optional(),
    idempotency_key: IdempotencyKeySchema.optional(),
  })
  .strict();

export const FinalizeOrderRequestSchema = z
  .object({
    restaurant_id: OptionalRestaurantIdSchema,
    session_id: SessionIdSchema,
    customer_name: z
      .string({ required_error: "customer_name is required" })
      .trim()
      .min(1, "customer_name is required")
      .max(200),
    customer_phone: z
      .string({ required_error: "customer_phone is required" })
      .trim()
      .min(1, "customer_phone is required")
      .max(40),
    fulfillment_type: FulfillmentTypeSchema.optional(),
    delivery_address: z.string().trim().min(1).max(500).optional(),
    delivery_instructions: z.string().trim().min(1).max(500).optional(),
    items: z.array(LineItemSchema).max(100).optional(),
    idempotency_key: IdempotencyKeySchema.optional(),
  })
  .strict()
  .refine(
    (body) =>
      body.fulfillment_type !== "delivery" ||
      Boolean(body.delivery_address?.trim()),
    {
      message: "delivery_address is required for delivery orders",
      path: ["delivery_address"],
    }
  );

export const GetOrderStatusRequestSchema = z
  .object({
    restaurant_id: OptionalRestaurantIdSchema,
    session_id: SessionIdSchema.optional(),
    customer_phone: z.string().trim().min(1).max(40).optional(),
    customer_name: z.string().trim().min(1).max(200).optional(),
  })
  .strict()
  .refine(
    (body) => Boolean(body.session_id || body.customer_phone || body.customer_name),
    {
      message:
        "Provide session_id, customer_phone, or customer_name to find an order.",
      path: ["session_id"],
    }
  );

export const GetCallerHistoryRequestSchema = z
  .object({
    restaurant_id: OptionalRestaurantIdSchema,
    customer_phone: z.string().trim().min(1).max(40).optional(),
    customer_name: z.string().trim().min(1).max(200).optional(),
  })
  .strict()
  .refine((body) => Boolean(body.customer_phone || body.customer_name), {
    message: "Provide customer_phone or customer_name to find caller history.",
    path: ["customer_phone"],
  });

export const SubmitReservationRequestSchema = z
  .object({
    restaurant_id: OptionalRestaurantIdSchema,
    session_id: SessionIdSchema.optional(),
    conversation_id: z.string().trim().min(1).max(512).optional(),
    customer_name: z
      .string({ required_error: "customer_name is required" })
      .trim()
      .min(2, "customer_name must be at least 2 characters")
      .max(200),
    customer_phone: z
      .string({ required_error: "customer_phone is required" })
      .trim()
      .min(7, "customer_phone must be at least 7 characters")
      .max(40),
    party_size: z.coerce.number().int().min(1).max(100),
    requested_date: z
      .string({ required_error: "requested_date is required" })
      .trim()
      .min(1, "requested_date is required")
      .max(80),
    requested_time: z
      .string({ required_error: "requested_time is required" })
      .trim()
      .min(1, "requested_time is required")
      .max(80),
    notes: z.string().trim().max(500).optional(),
    idempotency_key: IdempotencyKeySchema.optional(),
  })
  .strict();

const ModifierSchema = z
  .object({
    id: z.string().uuid(),
    group_name: z.string().nullable().optional(),
    modifier_name: z.string(),
    extra_price: z.number().nullable().optional(),
    min_selection: z.number().nullable().optional(),
    max_selection: z.number().nullable().optional(),
  })
  .passthrough();

const MenuItemSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string().nullable().optional(),
    price: z.number().nullable().optional(),
    is_available: z.boolean(),
    modifiers: z.array(ModifierSchema).default([]),
  })
  .passthrough();

const MenuCategorySchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    sort_order: z.number().nullable().optional(),
    items: z.array(MenuItemSchema),
  })
  .passthrough();

export const OperationsSchema = z
  .object({
    ordering_allowed: z.boolean(),
    message: z.string().optional(),
    status: z.string().optional(),
  })
  .passthrough();

export const GetMenuResponseSchema = z
  .object({
    restaurant: z
      .object({
        id: z.string().uuid(),
        name: z.string(),
      })
      .passthrough(),
    categories: z.array(MenuCategorySchema),
    restaurant_name_hint: z.string().nullable().optional(),
    operations: OperationsSchema,
  })
  .strict();

export const DraftOrderSchema = z
  .object({
    id: z.string().uuid().optional(),
    restaurant_id: z.string().uuid(),
    session_id: SessionIdSchema,
    status: z.string(),
    items: z.array(z.unknown()),
    customer_name: z.string().nullable().optional(),
    customer_phone: z.string().nullable().optional(),
    fulfillment_type: FulfillmentTypeSchema.nullable().optional(),
    delivery_address: z.string().nullable().optional(),
    delivery_instructions: z.string().nullable().optional(),
    updated_at: z.string().optional(),
  })
  .passthrough();

export const SyncDraftOrderResponseSchema = z
  .object({
    ok: z.literal(true),
    draft_order: DraftOrderSchema,
  })
  .strict();

export const FinalizeOrderResponseSchema = z
  .object({
    ok: z.literal(true),
    draft_order: DraftOrderSchema,
    receipt_skipped: z.boolean().optional(),
  })
  .strict();

export const OrderStatusSummarySchema = z
  .object({
    found: z.boolean(),
    status: z.string().nullable(),
    status_label: z.string().nullable(),
    message: z.string(),
    session_id: z.string().nullable(),
    customer_name: z.string().nullable().optional(),
    customer_phone: z.string().nullable().optional(),
    item_count: z.number().int().min(0),
    updated_at: z.string().nullable(),
    created_at: z.string().nullable().optional(),
  })
  .strict();

export const GetOrderStatusResponseSchema = z
  .object({
    ok: z.literal(true),
    order: OrderStatusSummarySchema,
  })
  .strict();

export const CallerHistorySummarySchema = z
  .object({
    found: z.boolean(),
    customer_name: z.string().nullable(),
    customer_phone: z.string().nullable(),
    visit_count: z.number().int().min(0),
    completed_order_count: z.number().int().min(0),
    last_order_at: z.string().nullable(),
    last_order_items: z.array(z.string()),
    favorite_items: z.array(z.string()),
    message: z.string(),
  })
  .strict();

export const GetCallerHistoryResponseSchema = z
  .object({
    ok: z.literal(true),
    caller: CallerHistorySummarySchema,
  })
  .strict();

export const ReservationRequestSummarySchema = z
  .object({
    id: z.string().uuid(),
    restaurant_id: z.string().uuid(),
    session_id: z.string().nullable(),
    conversation_id: z.string().nullable(),
    customer_name: z.string(),
    customer_phone: z.string(),
    party_size: z.number().int().min(1),
    requested_date: z.string(),
    requested_time: z.string(),
    notes: z.string().nullable(),
    status: z.string(),
    created_at: z.string(),
    message: z.string(),
  })
  .strict();

export const SubmitReservationResponseSchema = z
  .object({
    ok: z.literal(true),
    reservation_request: ReservationRequestSummarySchema,
  })
  .strict();

const RestaurantInfoKnowledgeEntrySchema = z
  .object({
    category: z.string(),
    question: z.string(),
    answer: z.string(),
  })
  .strict();

export const RestaurantInfoOperationsSchema = OperationsSchema.extend({
  local_date: z.string().optional(),
  local_time: z.string().optional(),
}).passthrough();

export const GetRestaurantInfoResponseSchema = z
  .object({
    ok: z.literal(true),
    restaurant: z
      .object({
        id: z.string().uuid(),
        name: z.string(),
        phone: z.string().nullable(),
        website: z.string().nullable(),
        cuisine: z.string().nullable(),
        address: z
          .object({
            line1: z.string().nullable(),
            line2: z.string().nullable(),
            city: z.string().nullable(),
            region: z.string().nullable(),
            postal_code: z.string().nullable(),
            country: z.string().nullable(),
            display: z.string().nullable(),
          })
          .strict(),
        service_modes: z
          .object({
            pickup: z.boolean(),
            delivery: z.boolean(),
          })
          .strict(),
        prep_time_minutes: z.number().int().nullable(),
        prep_time_message: z.string(),
      })
      .strict(),
    operations: RestaurantInfoOperationsSchema,
    knowledge_entries: z.array(RestaurantInfoKnowledgeEntrySchema),
  })
  .strict();

export type AgentToolIssue = {
  path: string;
  code: string;
  message: string;
  suggestion: string | null;
};

export type AgentToolErrorBody = {
  error: string;
  code: string;
  message: string;
  issues?: AgentToolIssue[];
  recovery_hint?: string;
};

const FIELD_SUGGESTIONS: Record<string, string> = {
  restaurant_id:
    "Include restaurant_id in the tool body, query string, or x-roal-restaurant-id header.",
  session_id:
    "Use the ElevenLabs conversation id as session_id for the whole call.",
  status: 'Use status "draft" while the guest is still ordering.',
  items:
    "Pass the full cart as items[]. Each line needs name or item_id and quantity 1–99.",
  customer_name:
    "Use the guest name only if they stated it. For finalize_order, ask for the real name first. For get_order_status and get_caller_history, prefer customer_phone when available.",
  customer_phone:
    "Ask the guest for a callback number before finalize_order. For get_order_status and get_caller_history, prefer the phone number tied to the order.",
  fulfillment_type:
    'Set fulfillment_type to "pickup" or "delivery" after the guest chooses. Do not finalize until the choice is clear.',
  delivery_address:
    "For delivery orders, ask for the full delivery address before finalize_order. Never invent or use a placeholder address.",
  delivery_instructions:
    "Optional delivery notes only if the caller states them, such as gate code, suite, or leave-at-door instruction.",
  party_size: "Ask how many guests are in the party before submitting a reservation request.",
  requested_date:
    "Ask for the requested reservation date in the guest's own words; do not invent a date.",
  requested_time:
    "Ask for the requested reservation time in the guest's own words; do not invent a time.",
  name: "Use the exact menu item name from get_menu_items.",
  item_id: "Use item_id from the latest get_menu_items response.",
  quantity: "Quantity must be an integer from 1 to 99.",
};

function suggestionForPath(path: (string | number)[]): string | null {
  const key = path.map(String).join(".");
  if (FIELD_SUGGESTIONS[key]) return FIELD_SUGGESTIONS[key];
  const last = path.length > 0 ? String(path[path.length - 1]) : "";
  return FIELD_SUGGESTIONS[last] ?? null;
}

export function formatZodValidationError(
  error: z.ZodError,
  context?: { tool?: string }
): AgentToolErrorBody {
  const issues: AgentToolIssue[] = error.issues.map((issue) => ({
    path: issue.path.length > 0 ? issue.path.map(String).join(".") : "(root)",
    code: issue.code,
    message: issue.message,
    suggestion: suggestionForPath(issue.path),
  }));

  const missingRestaurant = issues.some(
    (i) =>
      i.path === "restaurant_id" ||
      i.message.toLowerCase().includes("restaurant_id")
  );
  const missingSession = issues.some((i) => i.path === "session_id");
  const missingItems = issues.some(
    (i) =>
      i.path === "items" ||
      (i.path.startsWith("items") && i.code === "invalid_type")
  );
  const missingCustomer = issues.some(
    (i) => i.path === "customer_name" || i.path === "customer_phone"
  );
  const missingDeliveryAddress = issues.some(
    (i) => i.path === "delivery_address"
  );
  const badLineItem = issues.some(
    (i) => i.path === "name" || /^items(\.\d+|\[\d+\])\.name$/.test(i.path)
  );

  let recovery_hint =
    "Fix the request fields and call the tool again with complete data.";
  if (missingRestaurant) {
    recovery_hint =
      "Restaurant scope is missing or invalid. Re-run get_menu_items or reconnect the voice agent on the KDS.";
  } else if (missingSession) {
    recovery_hint =
      "Use a stable session_id before sync_draft_order or finalize_order.";
  } else if (missingItems) {
    recovery_hint =
      "Include items as an array of line objects (name or item_id plus quantity). Call get_menu_items first.";
  } else if (missingCustomer && context?.tool === "get_caller_history") {
    recovery_hint =
      "Ask the guest for the phone number or name they used on a prior order, then call get_caller_history again.";
  } else if (missingCustomer) {
    recovery_hint =
      "Ask the guest for their real name and callback phone, then call finalize_order again.";
  } else if (missingDeliveryAddress) {
    recovery_hint =
      "Ask the guest for the full delivery address, then call finalize_order again with fulfillment_type delivery and delivery_address.";
  } else if (badLineItem) {
    recovery_hint =
      "Each cart line needs a menu name or item_id from get_menu_items.";
  }

  return {
    error: "validation_failed",
    code: "validation_failed",
    message: context?.tool
      ? `${context.tool} request failed validation.`
      : "Request failed validation.",
    issues,
    recovery_hint,
  };
}

export type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; body: AgentToolErrorBody };

export function parseAgentToolRequest<T>(
  schema: z.ZodType<T>,
  data: unknown,
  context?: { tool?: string }
): ParseResult<T> {
  const result = schema.safeParse(data);
  if (result.success) return { ok: true, data: result.data };
  return {
    ok: false,
    status: 400,
    body: formatZodValidationError(result.error, context),
  };
}

export function parseAgentToolResponse<T>(
  schema: z.ZodType<T>,
  data: unknown,
  context: { tool: string }
): ParseResult<T> {
  const result = schema.safeParse(data);
  if (result.success) return { ok: true, data: result.data };
  console.error(`[${context.tool}] response validation failed`, result.error.flatten());
  return {
    ok: false,
    status: 500,
    body: {
      error: "internal_response_error",
      code: "response_validation_failed",
      message:
        "The server produced an invalid response. Retry once; if it persists, contact support.",
      recovery_hint: "Retry after get_menu_items.",
    },
  };
}

export function assertRestaurantIdMatches(
  bodyRestaurantId: string | undefined,
  authRestaurantId: string
): ParseResult<void> {
  if (
    bodyRestaurantId &&
    bodyRestaurantId.trim().toLowerCase() !== authRestaurantId.trim().toLowerCase()
  ) {
    return {
      ok: false,
      status: 403,
      body: {
        error: "restaurant_id mismatch",
        code: "restaurant_id_mismatch",
        message:
          "restaurant_id in the body does not match the authenticated restaurant scope.",
        recovery_hint:
          "For baked agents omit restaurant_id from the body or match the signed token scope.",
      },
    };
  }
  return { ok: true, data: undefined };
}
