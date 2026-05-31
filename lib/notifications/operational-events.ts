import type { SupabaseClient } from "@supabase/supabase-js";
import { writeAuditLog } from "@/lib/observability/audit";
import { dispatchNotification } from "@/lib/notifications/dispatch";
import type { NotificationEventType } from "@/lib/notifications/types";

export function stateTransitioned(
  previous: string | null | undefined,
  next: string | null | undefined,
  target: string
): boolean {
  return next === target && previous !== target;
}

type RestaurantOperationalContext = {
  organizationId: string;
  restaurantId: string;
  restaurantName: string;
};

async function loadRestaurantOperationalContext(
  supabase: SupabaseClient,
  restaurantId: string,
  restaurantNameHint?: string
): Promise<RestaurantOperationalContext | null> {
  const nameFromHint = restaurantNameHint?.trim();
  const { data, error } = await supabase
    .from("restaurants")
    .select("id, name, organization_id")
    .eq("id", restaurantId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data?.organization_id) return null;

  return {
    organizationId: data.organization_id as string,
    restaurantId: data.id as string,
    restaurantName: nameFromHint || (data.name as string) || "Restaurant",
  };
}

async function emitOperationalNotification(
  supabase: SupabaseClient,
  input: {
    ctx: RestaurantOperationalContext;
    userId?: string | null;
    eventType: NotificationEventType;
    auditAction: string;
    title: string;
    body: string;
    idempotencyKey: string;
    auditMetadata?: Record<string, unknown>;
    payload?: Record<string, unknown>;
  }
): Promise<boolean> {
  const notified = await dispatchNotification(supabase, {
    organizationId: input.ctx.organizationId,
    restaurantId: input.ctx.restaurantId,
    restaurantName: input.ctx.restaurantName,
    eventType: input.eventType,
    title: input.title,
    body: input.body.slice(0, 500),
    payload: input.payload,
    idempotencyKey: input.idempotencyKey,
  });

  if (!notified) return false;

  void writeAuditLog(supabase, {
    organizationId: input.ctx.organizationId,
    restaurantId: input.ctx.restaurantId,
    userId: input.userId ?? null,
    action: input.auditAction,
    resourceType: "restaurant",
    resourceId: input.ctx.restaurantId,
    outcome: "failure",
    metadata: {
      event_type: input.eventType,
      ...input.auditMetadata,
    },
  });

  return true;
}

export async function emitProvisionFailureIfTransition(
  supabase: SupabaseClient,
  input: {
    restaurantId: string;
    restaurantName?: string;
    organizationId?: string;
    userId?: string | null;
    previousProvisionStatus: string | null | undefined;
    phase: "provision" | "sync";
    message: string;
    agentId?: string | null;
  }
): Promise<boolean> {
  if (!stateTransitioned(input.previousProvisionStatus, "failed", "failed")) {
    return false;
  }

  const ctx =
    input.organizationId != null
      ? {
          organizationId: input.organizationId,
          restaurantId: input.restaurantId,
          restaurantName: input.restaurantName?.trim() || "Restaurant",
        }
      : await loadRestaurantOperationalContext(
          supabase,
          input.restaurantId,
          input.restaurantName
        );
  if (!ctx) return false;

  const digest = input.message.slice(0, 120);
  return emitOperationalNotification(supabase, {
    ctx,
    userId: input.userId,
    eventType: "provision_failure",
    auditAction: "voice_agent.provision_failure",
    title: `Voice agent setup failed · ${ctx.restaurantName}`,
    body: input.message,
    idempotencyKey: `provision_failure:${ctx.restaurantId}`,
    auditMetadata: {
      phase: input.phase,
      agent_id: input.agentId ?? null,
      error: digest,
    },
    payload: {
      phase: input.phase,
      agent_id: input.agentId ?? null,
      error: digest,
    },
  });
}

export async function emitMenuAutoSyncFailureIfTransition(
  supabase: SupabaseClient,
  input: {
    restaurantId: string;
    restaurantName?: string;
    organizationId?: string;
    userId?: string | null;
    previousMenuAutoSyncStatus: string | null | undefined;
    message: string;
    trigger?: string | null;
  }
): Promise<boolean> {
  if (!stateTransitioned(input.previousMenuAutoSyncStatus, "failed", "failed")) {
    return false;
  }

  const ctx =
    input.organizationId != null
      ? {
          organizationId: input.organizationId,
          restaurantId: input.restaurantId,
          restaurantName: input.restaurantName?.trim() || "Restaurant",
        }
      : await loadRestaurantOperationalContext(
          supabase,
          input.restaurantId,
          input.restaurantName
        );
  if (!ctx) return false;

  const digest = input.message.slice(0, 120);
  return emitOperationalNotification(supabase, {
    ctx,
    userId: input.userId,
    eventType: "menu_auto_sync_failure",
    auditAction: "menu_auto_sync.failure",
    title: `Menu sync to voice agent failed · ${ctx.restaurantName}`,
    body: input.message,
    idempotencyKey: `menu_auto_sync_failure:${ctx.restaurantId}`,
    auditMetadata: {
      trigger: input.trigger ?? null,
      error: digest,
    },
    payload: {
      trigger: input.trigger ?? null,
      error: digest,
    },
  });
}

export async function emitGoLiveIfTransition(
  supabase: SupabaseClient,
  input: {
    restaurantId: string;
    organizationId: string;
    restaurantName?: string;
    userId?: string | null;
    previousGoLiveStatus: string | null | undefined;
  }
): Promise<boolean> {
  if (!stateTransitioned(input.previousGoLiveStatus, "completed", "completed")) {
    return false;
  }

  const ctx = await loadRestaurantOperationalContext(
    supabase,
    input.restaurantId,
    input.restaurantName
  );
  if (!ctx || ctx.organizationId !== input.organizationId) return false;

  const notified = await dispatchNotification(supabase, {
    organizationId: ctx.organizationId,
    restaurantId: ctx.restaurantId,
    restaurantName: ctx.restaurantName,
    eventType: "go_live",
    title: `Location is live · ${ctx.restaurantName}`,
    body: `${ctx.restaurantName} finished onboarding and is ready for guest phone orders.`,
    idempotencyKey: `go_live:${ctx.restaurantId}`,
    payload: { restaurant_id: ctx.restaurantId },
  });

  if (!notified) return false;

  void writeAuditLog(supabase, {
    organizationId: ctx.organizationId,
    restaurantId: ctx.restaurantId,
    userId: input.userId ?? null,
    action: "restaurant.go_live",
    resourceType: "restaurant_onboarding",
    resourceId: ctx.restaurantId,
    outcome: "success",
    metadata: { step: "go_live" },
  });

  return true;
}

export async function emitOrderStuckIfTransition(
  supabase: SupabaseClient,
  input: {
    organizationId: string;
    restaurantId: string;
    restaurantName: string;
    orderId: string;
    sessionId: string;
    status: string;
    thresholdMinutes: number;
    customerLabel: string;
  }
): Promise<boolean> {
  const idempotencyKey = `order_stuck:${input.orderId}:${input.thresholdMinutes}`;
  const notified = await dispatchNotification(supabase, {
    organizationId: input.organizationId,
    restaurantId: input.restaurantId,
    restaurantName: input.restaurantName,
    eventType: "order_stuck",
    title: `Order stuck · ${input.restaurantName}`,
    body: `${input.customerLabel} has been in "${input.status}" for over ${input.thresholdMinutes} minutes.`,
    payload: {
      order_id: input.orderId,
      session_id: input.sessionId,
      status: input.status,
      threshold_minutes: input.thresholdMinutes,
    },
    idempotencyKey,
  });

  if (!notified) return false;

  void writeAuditLog(supabase, {
    organizationId: input.organizationId,
    restaurantId: input.restaurantId,
    action: "order.stuck",
    resourceType: "draft_order",
    resourceId: input.orderId,
    outcome: "failure",
    metadata: {
      session_id: input.sessionId,
      status: input.status,
      threshold_minutes: input.thresholdMinutes,
    },
  });

  return true;
}

export async function emitStaffHandoffRequested(
  supabase: SupabaseClient,
  input: {
    restaurantId: string;
    sessionId: string;
    conversationId?: string | null;
    callerPhone?: string | null;
    outcome?: string | null;
    summary?: string | null;
    reason?: string | null;
  }
): Promise<boolean> {
  const ctx = await loadRestaurantOperationalContext(supabase, input.restaurantId);
  if (!ctx) return false;

  const callerLabel = input.callerPhone?.trim() || "A caller";
  const reason = input.reason?.trim() || "handoff requested";
  const summary = input.summary?.trim();
  const body = summary
    ? `${callerLabel} needs staff follow-up: ${summary}`
    : `${callerLabel} needs staff follow-up after a phone call.`;

  const notified = await dispatchNotification(supabase, {
    organizationId: ctx.organizationId,
    restaurantId: ctx.restaurantId,
    restaurantName: ctx.restaurantName,
    eventType: "staff_handoff_requested",
    title: `Staff follow-up needed · ${ctx.restaurantName}`,
    body,
    payload: {
      session_id: input.sessionId,
      conversation_id: input.conversationId ?? input.sessionId,
      caller_phone: input.callerPhone ?? null,
      outcome: input.outcome ?? null,
      reason,
      transcript_summary: summary ?? null,
    },
    idempotencyKey: `staff_handoff:${ctx.restaurantId}:${input.sessionId}`,
  });

  if (!notified) return false;

  void writeAuditLog(supabase, {
    organizationId: ctx.organizationId,
    restaurantId: ctx.restaurantId,
    action: "voice_agent.staff_handoff_requested",
    resourceType: "agent_call_event",
    resourceId: input.sessionId,
    outcome: "success",
    metadata: {
      conversation_id: input.conversationId ?? input.sessionId,
      caller_phone: input.callerPhone ?? null,
      call_outcome: input.outcome ?? null,
      reason,
    },
  });

  return true;
}
