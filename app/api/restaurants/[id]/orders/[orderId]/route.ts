import { NextResponse } from "next/server";
import { requireRestaurantAccess } from "@/lib/auth/context-server";
import { buildOrderStatusPatch } from "@/lib/orders/apply-order-status";
import {
  ORDER_ACTION_TARGET,
  type OrderAction,
} from "@/lib/order-status";
import { writeAuditLog } from "@/lib/observability/audit";
import { getRouteObservability, jsonResponse } from "@/lib/observability/route-context";
import { notifyOrderCompleted } from "@/lib/notifications/helpers";
import { recordRestaurantUsage } from "@/lib/usage/record";
import { createServerSupabase } from "@/lib/supabase/server";
import type { DraftOrderRow } from "@/lib/types";

export const runtime = "nodejs";

const ACTIONS = new Set<OrderAction>([
  "accept",
  "start",
  "mark_ready",
  "complete",
  "cancel",
]);

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; orderId: string } }
) {
  const { requestId, log } = getRouteObservability(req, "api.orders.patch");

  try {
    const restaurantId = params.id;
    const orderId = params.orderId;

    if (!restaurantId || !orderId) {
      return NextResponse.json(
        { error: "restaurant id and order id are required" },
        { status: 400 }
      );
    }

    const access = await requireRestaurantAccess(restaurantId);
    if (access.errorResponse) return access.errorResponse;

    let body: { action?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const action = body.action;

    if (typeof action !== "string" || !ACTIONS.has(action as OrderAction)) {
      return NextResponse.json(
        {
          error:
            'action must be one of: accept, start, mark_ready, complete, cancel',
        },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabase();
    const { data: order, error: loadErr } = await supabase
      .from("draft_orders")
      .select("*")
      .eq("id", orderId)
      .eq("restaurant_id", restaurantId)
      .maybeSingle<DraftOrderRow>();

    if (loadErr) {
      return NextResponse.json({ error: loadErr.message }, { status: 500 });
    }
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const built = buildOrderStatusPatch(order, action as OrderAction);
    if (!built.ok) {
      return NextResponse.json({ error: built.error }, { status: 409 });
    }

    const { data: updated, error: updateErr } = await supabase
      .from("draft_orders")
      .update(built.patch)
      .eq("id", orderId)
      .eq("restaurant_id", restaurantId)
      .select("*")
      .single<DraftOrderRow>();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    const { restaurant, role } = access.access;
    void writeAuditLog(supabase, {
      requestId,
      organizationId: restaurant.organization_id,
      restaurantId,
      userId: access.context.user.id,
      action: `order.${action}`,
      resourceType: "draft_order",
      resourceId: orderId,
      outcome: "success",
      metadata: {
        previous_status: order.status,
        next_status: updated.status,
        role,
      },
    });
    log.info("order_status_updated", {
      order_id: orderId,
      action,
      status: updated.status,
    });

    if (action === "complete" && updated) {
      void notifyOrderCompleted(supabase, {
        organizationId: restaurant.organization_id,
        restaurantId,
        restaurantName: restaurant.name,
        orderId: updated.id,
        sessionId: updated.session_id,
        customerName: updated.customer_name,
      });
      const sessionId = updated.session_id?.trim();
      void recordRestaurantUsage(supabase, {
        eventType: "order_completed",
        organizationId: restaurant.organization_id,
        restaurantId,
        userId: access.context.user.id,
        sessionId: updated.session_id,
        idempotencyKey: sessionId
          ? `order_completed:${restaurantId}:${sessionId}`
          : `order_completed:${updated.id}`,
        metadata: {
          session_id: updated.session_id,
          line_count: Array.isArray(updated.items) ? updated.items.length : 0,
          order_status: updated.status,
        },
      });
    }

    return jsonResponse(
      {
        ok: true,
        order: updated,
        action,
        status: ORDER_ACTION_TARGET[action as OrderAction],
      },
      undefined,
      requestId
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    log.error("order_patch_failed", { error: message });
    return jsonResponse({ error: message }, { status: 500 }, requestId);
  }
}
