import { markAgentCallOrderCompleted } from "@/lib/agent-calls/mark-call-order-completed";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  assertRestaurantIdMatches,
  FinalizeOrderRequestSchema,
  FinalizeOrderResponseSchema,
  GetCallerHistoryRequestSchema,
  GetCallerHistoryResponseSchema,
  GetRestaurantInfoResponseSchema,
  GetOrderStatusRequestSchema,
  GetOrderStatusResponseSchema,
  GetMenuResponseSchema,
  parseAgentToolRequest,
  parseAgentToolResponse,
  SubmitReservationRequestSchema,
  SubmitReservationResponseSchema,
  SyncDraftOrderRequestSchema,
  SyncDraftOrderResponseSchema,
} from "@/lib/agent-tools/schemas";
import {
  coerceSyncDraftOrderStatus,
  FINALIZE_ORDER_STATUS,
  normalizeOrderStatus,
} from "@/lib/order-status";
import { loadRestaurantMenu } from "@/lib/menu-editor/load-menu";
import {
  loadRestaurantHoursBundle,
  operationsPayloadForRestaurantInfo,
} from "@/lib/restaurant-hours/helpers";
import {
  formatProfileAddress,
  getRestaurantProfile,
  serviceModesFromProfile,
} from "@/lib/restaurant-profile/helpers";
import {
  loadRestaurantKnowledgeEntries,
  restaurantInfoKnowledgeStatusMessage,
} from "@/lib/restaurant-knowledge/helpers";
import {
  cartLinesForStorage,
  formatCartValidationError,
  formatCustomerValidationError,
  validateCartForFinalize,
  validateCartForSync,
  validateCustomerForFinalize,
  type CartValidationResult,
} from "@/lib/orders/validate-cart";
import {
  formatFulfillmentValidationError,
  serviceModesFromProfileFlags,
  validateFulfillmentForOrder,
} from "@/lib/orders/validate-fulfillment";
import { buildCallerOrderStatusTimeline } from "@/lib/orders/status-history";
import { buildGetMenuHarnessResponse } from "@/lib/voice-agent/test-harness/build-get-menu";
import type { HarnessToolName } from "@/lib/voice-agent/test-harness/types";

type DryRunDraftContext = {
  items: unknown[];
  fulfillment_type: "pickup" | "delivery" | null;
  delivery_address: string | null;
  delivery_instructions: string | null;
};

const dryRunDrafts = new Map<string, DryRunDraftContext>();

function infoPrepMessage(minutes: number | null): string {
  if (!minutes) return "Prep time is not configured. Do not guess a pickup time.";
  return `Typical pickup prep time is about ${minutes} minutes. Quote this as an estimate, not a promise.`;
}

function dryRunDraftKey(restaurantId: string, sessionId: string): string {
  return `${restaurantId}:${sessionId}`;
}

export function clearHarnessDryRunDraft(
  restaurantId: string,
  sessionId: string
): void {
  dryRunDrafts.delete(dryRunDraftKey(restaurantId, sessionId));
}

export type SimulateHarnessToolResult = {
  httpStatus: number;
  ok: boolean;
  response: unknown;
  cartValidation?: CartValidationResult;
  wroteDatabase: boolean;
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  draft: "being taken",
  new: "received by the kitchen",
  accepted: "accepted by the kitchen",
  in_progress: "being prepared",
  ready: "ready for pickup",
  completed: "completed",
  canceled: "canceled",
};

function orderStatusLineCount(items: unknown): number {
  if (!Array.isArray(items)) return 0;
  return items.reduce((sum, item) => {
    const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    const quantity = Number(row.quantity ?? 1);
    return sum + (Number.isFinite(quantity) && quantity > 0 ? quantity : 1);
  }, 0);
}

function orderStatusMessage(status: string | null, found: boolean): string {
  if (!found) {
    return "I could not find a recent matching pickup order. Please ask for the phone number or name on the order, then try again.";
  }
  const normalized = normalizeOrderStatus(status);
  if (normalized === "draft") return "That order is still being taken and has not reached the kitchen yet.";
  if (normalized === "new") return "That order has been received by the kitchen.";
  if (normalized === "accepted") return "That order has been accepted by the kitchen.";
  if (normalized === "in_progress") return "That order is being prepared.";
  if (normalized === "ready") return "That order is ready for pickup.";
  if (normalized === "completed") return "That order is marked completed.";
  if (normalized === "canceled") return "That order is marked canceled.";
  return "I found the order, but its kitchen status is unclear.";
}

function phoneDigits(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

function phoneMatchKey(value: string | null | undefined): string {
  const digits = phoneDigits(value);
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

const PLACEHOLDER_PHONE_RE = /^(?:\+?1)?(?:555|000|123)[0-9\s().-]*$/;

function validHumanPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return false;
  if (/^(\d)\1+$/.test(digits)) return false;
  if (PLACEHOLDER_PHONE_RE.test(phone)) return false;
  return true;
}

function reservationRequestMessage(row: {
  party_size: number;
  requested_date: string;
  requested_time: string;
}): string {
  const guests = Number(row.party_size) === 1 ? "1 guest" : `${row.party_size} guests`;
  return `Reservation request saved for ${guests} on ${row.requested_date} at ${row.requested_time}. Tell the caller this is a request, not a confirmed reservation, and staff will confirm.`;
}

function orderStatusSummary(row: Record<string, unknown> | null) {
  const status = row ? normalizeOrderStatus(String(row.status ?? "")) : null;
  return {
    found: Boolean(row),
    status,
    status_label: status ? ORDER_STATUS_LABELS[status] ?? status : null,
    message: orderStatusMessage(status, Boolean(row)),
    session_id: row ? String(row.session_id ?? "").trim() || null : null,
    customer_name: row ? String(row.customer_name ?? "").trim() || null : null,
    customer_phone: row ? String(row.customer_phone ?? "").trim() || null : null,
    item_count: row ? orderStatusLineCount(row.items) : 0,
    updated_at: row ? String(row.updated_at ?? "").trim() || null : null,
    created_at: row ? String(row.created_at ?? "").trim() || null : null,
    status_timeline: row
      ? buildCallerOrderStatusTimeline(row as Parameters<typeof buildCallerOrderStatusTimeline>[0])
      : [],
  };
}

function callerItemNames(items: unknown): string[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      return String(row.name ?? "").trim();
    })
    .filter(Boolean);
}

function callerFavorites(rows: Record<string, unknown>[]): string[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    for (const name of callerItemNames(row.items)) {
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([name]) => name);
}

function callerHistorySummary(rows: Record<string, unknown>[]) {
  const first = rows[0] ?? null;
  const lastItems = callerItemNames(first?.items);
  return {
    found: Boolean(first),
    customer_name: first ? String(first.customer_name ?? "").trim() || null : null,
    customer_phone: first ? String(first.customer_phone ?? "").trim() || null : null,
    visit_count: rows.length,
    completed_order_count: rows.length,
    last_order_at: first ? String(first.created_at ?? "").trim() || null : null,
    last_order_items: lastItems,
    favorite_items: callerFavorites(rows),
    message: first
      ? `Returning guest with ${rows.length} completed pickup order${rows.length === 1 ? "" : "s"} here. You may mention you can help with their usual, but do not assume they want it.`
      : "No prior completed pickup order was found for this restaurant. Treat the caller as a new guest.",
  };
}

async function lookupHarnessCallerHistory(input: {
  supabase: SupabaseClient;
  restaurantId: string;
  body: Record<string, unknown>;
}): Promise<SimulateHarnessToolResult> {
  const parsed = parseAgentToolRequest(GetCallerHistoryRequestSchema, input.body, {
    tool: "get_caller_history",
  });
  if (!parsed.ok) {
    return {
      httpStatus: parsed.status,
      ok: false,
      response: parsed.body,
      wroteDatabase: false,
    };
  }

  const scopedReceipts = (candidates: Record<string, unknown>[]) =>
    candidates.filter(
      (row) => String(row.restaurant_id ?? "").trim() === input.restaurantId
    );

  let rows: Record<string, unknown>[] = [];
  if (parsed.data.customer_phone) {
    const targetKey = phoneMatchKey(parsed.data.customer_phone);
    const { data } = await input.supabase
      .from("phone_order_receipts")
      .select("id, restaurant_id, session_id, items, customer_name, customer_phone, created_at")
      .eq("restaurant_id", input.restaurantId)
      .not("customer_phone", "is", null)
      .order("created_at", { ascending: false })
      .limit(100);
    rows =
      targetKey.length >= 10
        ? scopedReceipts(Array.isArray(data) ? (data as Record<string, unknown>[]) : [])
            .filter(
              (row) =>
                phoneMatchKey(String(row.customer_phone ?? "")) === targetKey
            )
            .slice(0, 10)
        : [];
  }
  if (rows.length === 0 && parsed.data.customer_name) {
    const { data } = await input.supabase
      .from("phone_order_receipts")
      .select("id, restaurant_id, session_id, items, customer_name, customer_phone, created_at")
      .eq("restaurant_id", input.restaurantId)
      .ilike("customer_name", parsed.data.customer_name)
      .order("created_at", { ascending: false })
      .limit(10);
    rows = scopedReceipts(
      Array.isArray(data) ? (data as Record<string, unknown>[]) : []
    );
  }

  const responseBody = {
    ok: true as const,
    caller: callerHistorySummary(rows),
  };
  const validated = parseAgentToolResponse(
    GetCallerHistoryResponseSchema,
    responseBody,
    { tool: "get_caller_history" }
  );
  if (!validated.ok) {
    return {
      httpStatus: validated.status,
      ok: false,
      response: validated.body,
      wroteDatabase: false,
    };
  }

  return {
    httpStatus: 200,
    ok: true,
    response: validated.data,
    wroteDatabase: false,
  };
}

async function submitHarnessReservationRequest(input: {
  supabase: SupabaseClient;
  restaurantId: string;
  body: Record<string, unknown>;
  dryRun: boolean;
}): Promise<SimulateHarnessToolResult> {
  const parsed = parseAgentToolRequest(SubmitReservationRequestSchema, input.body, {
    tool: "submit_reservation_request",
  });
  if (!parsed.ok) {
    return {
      httpStatus: parsed.status,
      ok: false,
      response: parsed.body,
      wroteDatabase: false,
    };
  }

  if (!validHumanPhone(parsed.data.customer_phone)) {
    return {
      httpStatus: 400,
      ok: false,
      response: {
        error: "validation_failed",
        code: "invalid_customer_phone",
        message: "Reservation request requires a real callback phone.",
        recovery_hint:
          "Ask the guest for the best callback number, read it back, then submit the reservation request again.",
      },
      wroteDatabase: false,
    };
  }

  const idempotencyKey = parsed.data.idempotency_key?.trim() || null;
  if (idempotencyKey && !input.dryRun) {
    const { data: cached } = await input.supabase
      .from("agent_tool_idempotency")
      .select("response_body, http_status")
      .eq("restaurant_id", input.restaurantId)
      .eq("idempotency_key", idempotencyKey)
      .eq("tool_name", "submit_reservation_request")
      .maybeSingle();
    if (cached?.response_body) {
      return {
        httpStatus: Number(cached.http_status ?? 200),
        ok: true,
        response: cached.response_body,
        wroteDatabase: false,
      };
    }
  }

  const row = {
    id: "11111111-1111-4111-8111-111111111111",
    restaurant_id: input.restaurantId,
    session_id: parsed.data.session_id ?? null,
    conversation_id: parsed.data.conversation_id ?? parsed.data.session_id ?? null,
    customer_name: parsed.data.customer_name,
    customer_phone: parsed.data.customer_phone,
    party_size: parsed.data.party_size,
    requested_date: parsed.data.requested_date,
    requested_time: parsed.data.requested_time,
    notes: parsed.data.notes ?? null,
    status: "requested",
    created_at: new Date().toISOString(),
  };

  if (!input.dryRun) {
    const { data: restaurant, error: restErr } = await input.supabase
      .from("restaurants")
      .select("organization_id")
      .eq("id", input.restaurantId)
      .maybeSingle();
    if (restErr || !restaurant?.organization_id) {
      return {
        httpStatus: 500,
        ok: false,
        response: {
          error: restErr?.message ?? "Restaurant organization missing",
          code: "database_error",
        },
        wroteDatabase: false,
      };
    }
    const { data, error } = await input.supabase
      .from("restaurant_reservation_requests")
      .insert({
        organization_id: restaurant.organization_id,
        restaurant_id: input.restaurantId,
        session_id: row.session_id,
        conversation_id: row.conversation_id,
        customer_name: row.customer_name,
        customer_phone: row.customer_phone,
        party_size: row.party_size,
        requested_date: row.requested_date,
        requested_time: row.requested_time,
        notes: row.notes,
        status: row.status,
      })
      .select(
        "id, restaurant_id, session_id, conversation_id, customer_name, customer_phone, party_size, requested_date, requested_time, notes, status, created_at"
      )
      .single();
    if (error || !data) {
      return {
        httpStatus: 500,
        ok: false,
        response: { error: error?.message ?? "Insert failed", code: "database_error" },
        wroteDatabase: false,
      };
    }
    Object.assign(row, data);
  }

  const responseBody = {
    ok: true as const,
    reservation_request: {
      ...row,
      message: reservationRequestMessage(row),
    },
  };
  const validated = parseAgentToolResponse(
    SubmitReservationResponseSchema,
    responseBody,
    { tool: "submit_reservation_request" }
  );
  if (!validated.ok) {
    return {
      httpStatus: validated.status,
      ok: false,
      response: validated.body,
      wroteDatabase: !input.dryRun,
    };
  }

  if (idempotencyKey && !input.dryRun) {
    await input.supabase.from("agent_tool_idempotency").upsert({
      restaurant_id: input.restaurantId,
      idempotency_key: idempotencyKey,
      tool_name: "submit_reservation_request",
      http_status: 200,
      response_body: validated.data,
      created_at: new Date().toISOString(),
    });
  }

  return {
    httpStatus: 200,
    ok: true,
    response: input.dryRun
      ? { ...validated.data, dry_run: true, would_insert: row }
      : validated.data,
    wroteDatabase: !input.dryRun,
  };
}

async function lookupHarnessOrderStatus(input: {
  supabase: SupabaseClient;
  restaurantId: string;
  body: Record<string, unknown>;
}): Promise<SimulateHarnessToolResult> {
  const parsed = parseAgentToolRequest(GetOrderStatusRequestSchema, input.body, {
    tool: "get_order_status",
  });
  if (!parsed.ok) {
    return {
      httpStatus: parsed.status,
      ok: false,
      response: parsed.body,
      wroteDatabase: false,
    };
  }

  const scopedRow = (candidate: Record<string, unknown> | null | undefined) => {
    if (!candidate) return null;
    if (String(candidate.restaurant_id ?? "").trim() !== input.restaurantId) {
      return null;
    }
    return candidate;
  };

  let row: Record<string, unknown> | null = null;
  if (parsed.data.session_id) {
    const { data } = await input.supabase
      .from("draft_orders")
      .select("*")
      .eq("restaurant_id", input.restaurantId)
      .eq("session_id", parsed.data.session_id)
      .maybeSingle();
    row = scopedRow((data as Record<string, unknown> | null) ?? null);
  }
  if (!row && parsed.data.customer_phone) {
    const targetKey = phoneMatchKey(parsed.data.customer_phone);
    const { data } = await input.supabase
      .from("draft_orders")
      .select("*")
      .eq("restaurant_id", input.restaurantId)
      .not("customer_phone", "is", null)
      .order("updated_at", { ascending: false })
      .limit(100);
    const rows = Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
    const match =
      targetKey.length >= 10
        ? rows.find(
            (entry) =>
              phoneMatchKey(String(entry.customer_phone ?? "")) === targetKey
          )
        : undefined;
    row = scopedRow(match ?? null);
  }
  if (!row && parsed.data.customer_name) {
    const { data } = await input.supabase
      .from("draft_orders")
      .select("*")
      .eq("restaurant_id", input.restaurantId)
      .ilike("customer_name", parsed.data.customer_name)
      .order("updated_at", { ascending: false })
      .limit(1);
    row = scopedRow(
      Array.isArray(data) && data[0] ? (data[0] as Record<string, unknown>) : null
    );
  }

  const responseBody = {
    ok: true as const,
    order: orderStatusSummary(row),
  };
  const validated = parseAgentToolResponse(
    GetOrderStatusResponseSchema,
    responseBody,
    { tool: "get_order_status" }
  );
  if (!validated.ok) {
    return {
      httpStatus: validated.status,
      ok: false,
      response: validated.body,
      wroteDatabase: false,
    };
  }

  return {
    httpStatus: 200,
    ok: true,
    response: validated.data,
    wroteDatabase: false,
  };
}

async function hoursOrderingAllowed(
  supabase: SupabaseClient,
  restaurantId: string
): Promise<{ allowed: boolean; message: string }> {
  try {
    const bundle = await loadRestaurantHoursBundle(supabase, restaurantId);
    if (!bundle) {
      return { allowed: true, message: "Hours not configured." };
    }
    return {
      allowed: bundle.evaluation.ordering_allowed,
      message: bundle.evaluation.message,
    };
  } catch {
    return { allowed: true, message: "Hours not configured." };
  }
}

export async function simulateHarnessTool(input: {
  supabase: SupabaseClient;
  restaurantId: string;
  restaurantName?: string;
  tool: HarnessToolName;
  body: Record<string, unknown>;
  dryRun: boolean;
}): Promise<SimulateHarnessToolResult> {
  const { supabase, restaurantId, tool, body, dryRun } = input;

  if (tool === "get_menu_items") {
    const { httpStatus, body: menuBody } = await buildGetMenuHarnessResponse(
      supabase,
      restaurantId,
      input.restaurantName ?? null
    );
    if (httpStatus >= 200 && httpStatus < 300) {
      const validated = parseAgentToolResponse(GetMenuResponseSchema, menuBody, {
        tool: "get_menu_items",
      });
      if (!validated.ok) {
        return {
          httpStatus: validated.status,
          ok: false,
          response: validated.body,
          wroteDatabase: false,
        };
      }
      return {
        httpStatus,
        ok: true,
        response: validated.data,
        wroteDatabase: false,
      };
    }
    return {
      httpStatus,
      ok: false,
      response: menuBody,
      wroteDatabase: false,
    };
  }

  if (tool === "get_restaurant_info") {
    const scopeCheck = assertRestaurantIdMatches(
      typeof body.restaurant_id === "string" ? body.restaurant_id : undefined,
      restaurantId
    );
    if (!scopeCheck.ok) {
      return {
        httpStatus: scopeCheck.status,
        ok: false,
        response: scopeCheck.body,
        wroteDatabase: false,
      };
    }

    const { data: restaurant, error: restaurantError } = await supabase
      .from("restaurants")
      .select("id, name")
      .eq("id", restaurantId)
      .maybeSingle();
    if (restaurantError) {
      return {
        httpStatus: 500,
        ok: false,
        response: {
          error: restaurantError.message,
          code: "database_error",
        },
        wroteDatabase: false,
      };
    }
    if (!restaurant) {
      return {
        httpStatus: 404,
        ok: false,
        response: {
          error: "not_found",
          code: "restaurant_not_found",
          message: "Restaurant not found.",
        },
        wroteDatabase: false,
      };
    }

    const profile = await getRestaurantProfile(supabase, restaurantId);
    const hours = await loadRestaurantHoursBundle(supabase, restaurantId);
    const knowledge = await loadRestaurantKnowledgeEntries(supabase, restaurantId, {
      activeOnly: true,
      limit: 24,
    }).catch(() => []);
    const response = {
      ok: true as const,
      restaurant: {
        id: restaurantId,
        name: String(restaurant.name ?? input.restaurantName ?? "").trim() || "Restaurant",
        phone: profile?.phone ?? null,
        website: profile?.website ?? null,
        cuisine: profile?.cuisine ?? null,
        address: {
          line1: profile?.address_line1 ?? null,
          line2: profile?.address_line2 ?? null,
          city: profile?.city ?? null,
          region: profile?.region ?? null,
          postal_code: profile?.postal_code ?? null,
          country: profile?.country ?? null,
          display: profile ? formatProfileAddress(profile) : null,
        },
        service_modes: serviceModesFromProfile(profile),
        prep_time_minutes: profile?.prep_time_minutes ?? null,
        prep_time_message: infoPrepMessage(profile?.prep_time_minutes ?? null),
      },
      operations: operationsPayloadForRestaurantInfo(hours),
      knowledge_entries: knowledge.map((entry) => ({
        category: entry.category,
        question: entry.question,
        answer: entry.answer,
      })),
      knowledge_status_message: restaurantInfoKnowledgeStatusMessage(
        knowledge.length
      ),
    };
    const validated = parseAgentToolResponse(
      GetRestaurantInfoResponseSchema,
      response,
      { tool: "get_restaurant_info" }
    );
    if (!validated.ok) {
      return {
        httpStatus: validated.status,
        ok: false,
        response: validated.body,
        wroteDatabase: false,
      };
    }
    return {
      httpStatus: 200,
      ok: true,
      response: validated.data,
      wroteDatabase: false,
    };
  }

  const scopeCheck = assertRestaurantIdMatches(
    typeof body.restaurant_id === "string" ? body.restaurant_id : undefined,
    restaurantId
  );
  if (!scopeCheck.ok) {
    return {
      httpStatus: scopeCheck.status,
      ok: false,
      response: scopeCheck.body,
      wroteDatabase: false,
    };
  }

  if (tool === "get_order_status") {
    return lookupHarnessOrderStatus({ supabase, restaurantId, body });
  }

  if (tool === "get_caller_history") {
    return lookupHarnessCallerHistory({ supabase, restaurantId, body });
  }

  if (tool === "submit_reservation_request") {
    return submitHarnessReservationRequest({
      supabase,
      restaurantId,
      body,
      dryRun,
    });
  }

  const hours = await hoursOrderingAllowed(supabase, restaurantId);
  if (!hours.allowed) {
    return {
      httpStatus: 403,
      ok: false,
      response: {
        error: "restaurant_closed",
        message: hours.message,
        operations: {
          ordering_allowed: false,
          message: hours.message,
        },
      },
      wroteDatabase: false,
    };
  }

  const profile = await getRestaurantProfile(supabase, restaurantId);
  const serviceModes = serviceModesFromProfileFlags(profile);

  const menu = await loadRestaurantMenu(supabase, restaurantId);

  if (tool === "sync_draft_order") {
    const parsed = parseAgentToolRequest(SyncDraftOrderRequestSchema, body, {
      tool: "sync_draft_order",
    });
    if (!parsed.ok) {
      return {
        httpStatus: parsed.status,
        ok: false,
        response: parsed.body,
        wroteDatabase: false,
      };
    }

    const cartValidation = validateCartForSync(
      parsed.data.items,
      menu.items,
      menu.modifiers
    );

    if (!cartValidation.ok) {
      return {
        httpStatus: 422,
        ok: false,
        response: formatCartValidationError(cartValidation, {
          tool: "sync_draft_order",
        }),
        cartValidation,
        wroteDatabase: false,
      };
    }

    const hasCartLines = cartValidation.normalizedItems.length > 0;
    const requestedFulfillment =
      parsed.data.fulfillment_type ?? (hasCartLines ? "pickup" : null);

    if (hasCartLines || parsed.data.fulfillment_type) {
      const fulfillmentCheck = validateFulfillmentForOrder({
        allowsPickup: serviceModes.allowsPickup,
        allowsDelivery: serviceModes.allowsDelivery,
        fulfillmentType: requestedFulfillment,
        deliveryAddress: parsed.data.delivery_address ?? null,
        requireDeliveryAddress: false,
      });
      if (!fulfillmentCheck.ok) {
        return {
          httpStatus: 422,
          ok: false,
          response: formatFulfillmentValidationError(
            fulfillmentCheck.issue,
            "sync_draft_order"
          ),
          cartValidation,
          wroteDatabase: false,
        };
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

    if (dryRun) {
      dryRunDrafts.set(dryRunDraftKey(restaurantId, parsed.data.session_id), {
        items: row.items as unknown[],
        fulfillment_type: parsed.data.fulfillment_type ?? null,
        delivery_address: parsed.data.delivery_address ?? null,
        delivery_instructions: parsed.data.delivery_instructions ?? null,
      });
      return {
        httpStatus: 200,
        ok: true,
        response: {
          ok: true,
          dry_run: true,
          would_upsert: row,
          cart_validation: cartValidation,
        },
        cartValidation,
        wroteDatabase: false,
      };
    }

    const { data, error } = await supabase
      .from("draft_orders")
      .upsert(row, { onConflict: "restaurant_id,session_id" })
      .select()
      .single();

    if (error) {
      return {
        httpStatus: 500,
        ok: false,
        response: { error: error.message, code: "database_error" },
        cartValidation,
        wroteDatabase: false,
      };
    }

    const responseBody = { ok: true as const, draft_order: data };
    const validated = parseAgentToolResponse(
      SyncDraftOrderResponseSchema,
      responseBody,
      { tool: "sync_draft_order" }
    );
    if (!validated.ok) {
      return {
        httpStatus: validated.status,
        ok: false,
        response: validated.body,
        cartValidation,
        wroteDatabase: true,
      };
    }

    return {
      httpStatus: 200,
      ok: true,
      response: validated.data,
      cartValidation,
      wroteDatabase: true,
    };
  }

  if (tool === "finalize_order") {
    const parsed = parseAgentToolRequest(FinalizeOrderRequestSchema, body, {
      tool: "finalize_order",
    });
    if (!parsed.ok) {
      return {
        httpStatus: parsed.status,
        ok: false,
        response: parsed.body,
        wroteDatabase: false,
      };
    }

    const customerCheck = validateCustomerForFinalize(
      parsed.data.customer_name,
      parsed.data.customer_phone
    );
    if (!customerCheck.ok) {
      return {
        httpStatus: 400,
        ok: false,
        response: formatCustomerValidationError(customerCheck.issues),
        wroteDatabase: false,
      };
    }

    let rawItems: unknown;
    let draftContext: DryRunDraftContext | null = null;
    let draftFulfillmentType: string | null = null;
    let draftDeliveryAddress: string | null = null;
    let draftDeliveryInstructions: string | null = null;
    if (parsed.data.items) {
      rawItems = parsed.data.items;
    } else if (dryRun) {
      draftContext =
        dryRunDrafts.get(dryRunDraftKey(restaurantId, parsed.data.session_id)) ??
        null;
      rawItems = draftContext?.items ?? [];
      draftFulfillmentType = draftContext?.fulfillment_type ?? null;
      draftDeliveryAddress = draftContext?.delivery_address ?? null;
      draftDeliveryInstructions = draftContext?.delivery_instructions ?? null;
    } else {
      const { data: cur } = await supabase
        .from("draft_orders")
        .select("items, fulfillment_type, delivery_address, delivery_instructions")
        .eq("restaurant_id", restaurantId)
        .eq("session_id", parsed.data.session_id)
        .maybeSingle();
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
      return {
        httpStatus: 422,
        ok: false,
        response: formatCartValidationError(cartValidation, {
          tool: "finalize_order",
        }),
        cartValidation,
        wroteDatabase: false,
      };
    }

    const storedItems = cartLinesForStorage(cartValidation.normalizedItems);
    const fulfillmentType =
      parsed.data.fulfillment_type ?? draftFulfillmentType ?? "pickup";
    const deliveryAddress =
      parsed.data.delivery_address ?? draftDeliveryAddress ?? null;
    const deliveryInstructions =
      parsed.data.delivery_instructions ?? draftDeliveryInstructions ?? null;

    const fulfillmentCheck = validateFulfillmentForOrder({
      allowsPickup: serviceModes.allowsPickup,
      allowsDelivery: serviceModes.allowsDelivery,
      fulfillmentType,
      deliveryAddress,
      requireDeliveryAddress: true,
    });
    if (!fulfillmentCheck.ok) {
      return {
        httpStatus:
          fulfillmentCheck.issue.code === "missing_delivery_address" ? 400 : 422,
        ok: false,
        response: formatFulfillmentValidationError(
          fulfillmentCheck.issue,
          "finalize_order"
        ),
        cartValidation,
        wroteDatabase: false,
      };
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

    if (dryRun) {
      dryRunDrafts.delete(
        dryRunDraftKey(restaurantId, parsed.data.session_id)
      );
      return {
        httpStatus: 200,
        ok: true,
        response: {
          ok: true,
          dry_run: true,
          would_upsert: row,
          cart_validation: cartValidation,
        },
        cartValidation,
        wroteDatabase: false,
      };
    }

    const { data, error } = await supabase
      .from("draft_orders")
      .upsert(row, { onConflict: "restaurant_id,session_id" })
      .select()
      .single();

    if (error) {
      return {
        httpStatus: 500,
        ok: false,
        response: { error: error.message, code: "database_error" },
        cartValidation,
        wroteDatabase: false,
      };
    }

    dryRunDrafts.delete(
      dryRunDraftKey(restaurantId, parsed.data.session_id)
    );

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

    let responseBody: Record<string, unknown> = {
      ok: true as const,
      draft_order: data,
    };
    if (recErr) {
      const msg = recErr.message ?? "";
      if (
        /phone_order_receipts/i.test(msg) &&
        /does not exist|schema cache|Could not find the table/i.test(msg)
      ) {
        responseBody = { ok: true, draft_order: data, receipt_skipped: true };
      } else {
        return {
          httpStatus: 500,
          ok: false,
          response: { error: recErr.message, code: "database_error" },
          cartValidation,
          wroteDatabase: true,
        };
      }
    }
    const validated = parseAgentToolResponse(
      FinalizeOrderResponseSchema,
      responseBody,
      { tool: "finalize_order" }
    );
    if (!validated.ok) {
      return {
        httpStatus: validated.status,
        ok: false,
        response: validated.body,
        cartValidation,
        wroteDatabase: true,
      };
    }

    try {
      await markAgentCallOrderCompleted(supabase, {
        restaurantId,
        sessionId: parsed.data.session_id,
      });
    } catch {
      // Receipt is source of truth; call row update is best-effort.
    }

    return {
      httpStatus: 200,
      ok: true,
      response: validated.data,
      cartValidation,
      wroteDatabase: true,
    };
  }

  return {
    httpStatus: 400,
    ok: false,
    response: { error: "Unknown tool" },
    wroteDatabase: false,
  };
}

export function newHarnessSessionId(): string {
  return `roal-harness-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function isHarnessSessionId(sessionId: string): boolean {
  return sessionId.startsWith("roal-harness-");
}
