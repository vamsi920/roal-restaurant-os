import type { SupabaseClient } from "@supabase/supabase-js";
import {
  assertRestaurantIdMatches,
  FinalizeOrderRequestSchema,
  FinalizeOrderResponseSchema,
  GetMenuResponseSchema,
  parseAgentToolRequest,
  parseAgentToolResponse,
  SyncDraftOrderRequestSchema,
  SyncDraftOrderResponseSchema,
} from "@/lib/agent-tools/schemas";
import { coerceSyncDraftOrderStatus, FINALIZE_ORDER_STATUS } from "@/lib/order-status";
import { loadRestaurantMenu } from "@/lib/menu-editor/load-menu";
import { loadRestaurantHoursBundle } from "@/lib/restaurant-hours/helpers";
import { evaluateRestaurantHours } from "@/lib/restaurant-hours/core";
import {
  cartLinesForStorage,
  formatCartValidationError,
  formatCustomerValidationError,
  validateCartForFinalize,
  validateCartForSync,
  validateCustomerForFinalize,
  type CartValidationResult,
} from "@/lib/orders/validate-cart";
import { buildGetMenuHarnessResponse } from "@/lib/voice-agent/test-harness/build-get-menu";
import type { HarnessToolName } from "@/lib/voice-agent/test-harness/types";

const dryRunDraftItems = new Map<string, unknown[]>();

function dryRunDraftKey(restaurantId: string, sessionId: string): string {
  return `${restaurantId}:${sessionId}`;
}

export function clearHarnessDryRunDraft(
  restaurantId: string,
  sessionId: string
): void {
  dryRunDraftItems.delete(dryRunDraftKey(restaurantId, sessionId));
}

export type SimulateHarnessToolResult = {
  httpStatus: number;
  ok: boolean;
  response: unknown;
  cartValidation?: CartValidationResult;
  wroteDatabase: boolean;
};

async function hoursOrderingAllowed(
  supabase: SupabaseClient,
  restaurantId: string
): Promise<{ allowed: boolean; message: string }> {
  try {
    const bundle = await loadRestaurantHoursBundle(supabase, restaurantId);
    if (!bundle) {
      return { allowed: true, message: "Hours not configured." };
    }
    const evaluation = evaluateRestaurantHours({
      profile: bundle.profile,
      weekly: bundle.weekly,
      exceptions: bundle.exceptions,
    });
    return {
      allowed: evaluation.ordering_allowed,
      message: evaluation.message,
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

    if (dryRun) {
      dryRunDraftItems.set(
        dryRunDraftKey(restaurantId, parsed.data.session_id),
        row.items as unknown[]
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
    if (parsed.data.items) {
      rawItems = parsed.data.items;
    } else if (dryRun) {
      rawItems =
        dryRunDraftItems.get(
          dryRunDraftKey(restaurantId, parsed.data.session_id)
        ) ?? [];
    } else {
      const { data: cur } = await supabase
        .from("draft_orders")
        .select("items")
        .eq("restaurant_id", restaurantId)
        .eq("session_id", parsed.data.session_id)
        .maybeSingle();
      rawItems = cur?.items;
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

    const row = {
      restaurant_id: restaurantId,
      session_id: parsed.data.session_id,
      status: FINALIZE_ORDER_STATUS,
      items: storedItems,
      customer_name: customerCheck.customer_name,
      customer_phone: customerCheck.customer_phone,
      updated_at: new Date().toISOString(),
    };

    if (dryRun) {
      dryRunDraftItems.delete(
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

    dryRunDraftItems.delete(
      dryRunDraftKey(restaurantId, parsed.data.session_id)
    );

    const receiptRow = {
      restaurant_id: restaurantId,
      session_id: parsed.data.session_id,
      items: storedItems,
      customer_name: customerCheck.customer_name,
      customer_phone: customerCheck.customer_phone,
    };
    const { error: recErr } = await supabase
      .from("phone_order_receipts")
      .upsert(receiptRow, { onConflict: "restaurant_id,session_id" });

    const responseBody = {
      ok: true as const,
      draft_order: data,
      receipt_skipped: Boolean(recErr),
    };
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
