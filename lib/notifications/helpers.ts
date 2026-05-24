import type { SupabaseClient } from "@supabase/supabase-js";
import { dispatchNotification } from "@/lib/notifications/dispatch";

export async function notifyOrderCompleted(
  supabase: SupabaseClient,
  input: {
    organizationId: string;
    restaurantId: string;
    restaurantName: string;
    orderId: string;
    sessionId: string;
    customerName: string | null;
  }
): Promise<void> {
  const label = input.customerName?.trim() || `Session ${input.sessionId.slice(0, 8)}`;
  await dispatchNotification(supabase, {
    organizationId: input.organizationId,
    restaurantId: input.restaurantId,
    restaurantName: input.restaurantName,
    eventType: "order_completed",
    title: `Order completed · ${input.restaurantName}`,
    body: `${label} was marked complete on the kitchen display.`,
    payload: {
      order_id: input.orderId,
      session_id: input.sessionId,
    },
    idempotencyKey: `order_completed:${input.orderId}`,
  });
}

export async function notifyScanFailure(
  supabase: SupabaseClient,
  input: {
    organizationId: string;
    restaurantId: string;
    restaurantName: string;
    importId: string;
    message: string;
  }
): Promise<void> {
  await dispatchNotification(supabase, {
    organizationId: input.organizationId,
    restaurantId: input.restaurantId,
    restaurantName: input.restaurantName,
    eventType: "scan_failure",
    title: `Menu scan failed · ${input.restaurantName}`,
    body: input.message.slice(0, 500),
    payload: { import_id: input.importId },
    idempotencyKey: `scan_failure:${input.importId}`,
  });
}

export async function notifySyncFailure(
  supabase: SupabaseClient,
  input: {
    organizationId: string;
    restaurantId: string;
    restaurantName: string;
    message: string;
  }
): Promise<void> {
  const digest = input.message.slice(0, 120);
  await dispatchNotification(supabase, {
    organizationId: input.organizationId,
    restaurantId: input.restaurantId,
    restaurantName: input.restaurantName,
    eventType: "sync_failure",
    title: `Voice agent sync failed · ${input.restaurantName}`,
    body: input.message.slice(0, 500),
    payload: { error: digest },
    idempotencyKey: `sync_failure:${input.restaurantId}:${digest}`,
  });
}
