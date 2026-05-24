import { normalizeRestaurantUuid } from "@/lib/agent-tools/token";
import { z } from "zod";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const RestaurantIdSchema = z
  .string({ error: "restaurant_id is required" })
  .trim()
  .min(1, "restaurant_id is required")
  .refine((v) => UUID_RE.test(v), "restaurant_id must be a valid UUID");

export const OptionalRestaurantIdSchema = z
  .string()
  .trim()
  .refine((v) => UUID_RE.test(v), "restaurant_id must be a valid UUID")
  .optional();

export const SessionIdSchema = z
  .string({ error: "session_id is required" })
  .trim()
  .min(1, "session_id is required")
  .max(512, "session_id must be at most 512 characters");

export const IdempotencyKeySchema = z
  .string()
  .trim()
  .min(1)
  .max(128, "idempotency_key must be at most 128 characters");

export const SyncDraftStatusSchema = z.enum(["draft", "confirmed"], {
  error: 'status must be "draft" or legacy "confirmed"',
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

export const SyncDraftOrderRequestSchema = z
  .object({
    restaurant_id: OptionalRestaurantIdSchema,
    session_id: SessionIdSchema,
    status: SyncDraftStatusSchema,
    items: z.array(LineItemSchema).max(100, "items cannot exceed 100 lines"),
    customer_name: z.string().trim().min(1).max(200).optional(),
    customer_phone: z.string().trim().min(1).max(40).optional(),
    idempotency_key: IdempotencyKeySchema.optional(),
  })
  .strict();

export const FinalizeOrderRequestSchema = z
  .object({
    restaurant_id: OptionalRestaurantIdSchema,
    session_id: SessionIdSchema,
    customer_name: z
      .string({ error: "customer_name is required" })
      .trim()
      .min(1, "customer_name is required")
      .max(200),
    customer_phone: z
      .string({ error: "customer_phone is required" })
      .trim()
      .min(1, "customer_phone is required")
      .max(40),
    items: z.array(LineItemSchema).max(100).optional(),
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
    is_open_now: z.boolean().optional(),
    timezone: z.string().optional(),
    temporarily_closed: z.boolean().optional(),
    temporarily_closed_reason: z.string().nullable().optional(),
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
    restaurant_id: RestaurantIdSchema,
    session_id: SessionIdSchema,
    status: z.string(),
    items: z.array(z.unknown()),
    customer_name: z.string().nullable().optional(),
    customer_phone: z.string().nullable().optional(),
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

export type SyncDraftOrderRequest = z.infer<typeof SyncDraftOrderRequestSchema>;
export type FinalizeOrderRequest = z.infer<typeof FinalizeOrderRequestSchema>;

const FIELD_SUGGESTIONS: Record<string, string> = {
  restaurant_id:
    "Include restaurant_id in the tool body, query string, or x-roal-restaurant-id header. Baked agents use the signed token scope.",
  session_id:
    "Use the ElevenLabs conversation id (or stable call id) as session_id and keep it the same for sync_draft_order and finalize_order.",
  status: 'Use status "draft" while the guest is still ordering.',
  items:
    "Pass the full current cart as items[]. Each line needs name or item_id and quantity 1–99.",
  customer_name:
    "Ask the guest for their real name before calling finalize_order. Do not use placeholders.",
  customer_phone:
    "Ask the guest for a callback number before finalize_order. Read it back if unclear.",
  name: "Use the exact menu item name from get_menu_items, or pass item_id from the menu JSON.",
  item_id: "Use a valid item id from the latest get_menu_items response.",
  quantity: "Quantity must be an integer from 1 to 99.",
};

function suggestionForPath(path: PropertyKey[]): string | null {
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
  const badLineItem = issues.some(
    (i) => i.path === "name" || /^items(\.\d+|\[\d+\])\.name$/.test(i.path)
  );

  let recovery_hint =
    "Fix the request fields and call the tool again with complete data.";
  if (missingRestaurant) {
    recovery_hint =
      "Restaurant scope is missing or invalid. Re-run get_menu_items for this location or reconnect the voice agent on the KDS.";
  } else if (missingSession) {
    recovery_hint =
      "Start or continue the call with a stable session_id before syncing or finalizing the order.";
  } else if (missingItems) {
    recovery_hint =
      "Include items as an array of line objects (name or item_id plus quantity). Call get_menu_items first.";
  } else if (missingCustomer) {
    recovery_hint =
      "Ask the guest for their real name and callback phone, then call finalize_order again.";
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
  if (result.success) {
    return { ok: true, data: result.data };
  }
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
  if (result.success) {
    return { ok: true, data: result.data };
  }
  console.error(`[${context.tool}] response validation failed`, result.error.flatten());
  return {
    ok: false,
    status: 500,
    body: {
      error: "internal_response_error",
      code: "response_validation_failed",
      message: "The server produced an invalid response. Retry once; if it persists, contact support.",
      recovery_hint: "Retry the tool call after get_menu_items.",
    },
  };
}

export function assertRestaurantIdMatches(
  bodyRestaurantId: string | undefined,
  authRestaurantId: string
): ParseResult<void> {
  if (
    bodyRestaurantId &&
    normalizeRestaurantUuid(bodyRestaurantId) !== normalizeRestaurantUuid(authRestaurantId)
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
          "Remove restaurant_id from the body for baked agents, or pass the same UUID as the signed token and x-roal-restaurant-id header.",
      },
    };
  }
  return { ok: true, data: undefined };
}
