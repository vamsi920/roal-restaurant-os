import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const FORBIDDEN_KEY_RE =
  /^(authorization|cookie|token|secret|password|api[_-]?key|bearer|phone|customer_phone|customer_name|items|cart|raw|body|headers?)$/i;

const FORBIDDEN_VALUE_RE =
  /^(bearer\s+|roal1\.|eyJ[a-zA-Z0-9_-]*\.eyJ)/i;

type UsageEventType =
  | "menu_scan"
  | "import_attempt"
  | "tool_call"
  | "voice_order"
  | "order_completed"
  | "active_location";

function scrubValue(value: unknown, depth: number): unknown {
  if (depth > 4) return "[truncated]";
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    if (FORBIDDEN_VALUE_RE.test(value)) return "[redacted]";
    return value.length > 500 ? `${value.slice(0, 500)}…` : value;
  }
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    return value.slice(0, 50).map((v) => scrubValue(v, depth + 1));
  }
  if (typeof value === "object") {
    return scrubObject(value as Record<string, unknown>, depth + 1);
  }
  return String(value);
}

function scrubObject(
  obj: Record<string, unknown>,
  depth: number
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (FORBIDDEN_KEY_RE.test(key)) {
      out[key] = "[redacted]";
      continue;
    }
    out[key] = scrubValue(value, depth);
  }
  return out;
}

function sanitizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  return scrubObject(metadata, 0);
}

function truncateSessionId(sessionId: string | null | undefined): string | null {
  if (!sessionId) return null;
  const t = sessionId.trim();
  if (!t) return null;
  return t.length > 128 ? t.slice(0, 128) : t;
}

export async function recordUsageEvent(
  supabase: SupabaseClient,
  input: {
    eventType: UsageEventType;
    organizationId: string;
    restaurantId?: string | null;
    userId?: string | null;
    sessionId?: string | null;
    metadata?: Record<string, unknown>;
    idempotencyKey?: string | null;
  }
): Promise<void> {
  const { error } = await supabase.from("usage_events").insert({
    event_type: input.eventType,
    organization_id: input.organizationId,
    restaurant_id: input.restaurantId ?? null,
    user_id: input.userId ?? null,
    session_id: truncateSessionId(input.sessionId),
    idempotency_key: input.idempotencyKey?.trim() || null,
    metadata: sanitizeMetadata(input.metadata ?? {}),
  });

  if (error && error.code !== "23505") {
    console.error("[usage]", input.eventType, error.message);
  }
}

export async function recordActiveLocation(
  supabase: SupabaseClient,
  organizationId: string,
  restaurantId: string
): Promise<void> {
  const day = new Date().toISOString().slice(0, 10);
  await recordUsageEvent(supabase, {
    eventType: "active_location",
    organizationId,
    restaurantId,
    idempotencyKey: `active_location:${restaurantId}:${day}`,
    metadata: { day },
  });
}

export async function recordRestaurantUsage(
  supabase: SupabaseClient,
  input: {
    eventType: UsageEventType;
    organizationId: string;
    restaurantId: string;
    sessionId?: string | null;
    metadata?: Record<string, unknown>;
    idempotencyKey?: string | null;
  }
): Promise<void> {
  await recordUsageEvent(supabase, input);
  await recordActiveLocation(supabase, input.organizationId, input.restaurantId);
}

export async function resolveRestaurantOrganizationId(
  supabase: SupabaseClient,
  restaurantId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("restaurants")
    .select("organization_id")
    .eq("id", restaurantId)
    .maybeSingle();
  return data?.organization_id ? String(data.organization_id) : null;
}

export type AgentToolMeterTool =
  | "get_menu_items"
  | "get_restaurant_info"
  | "get_caller_history"
  | "submit_reservation_request"
  | "sync_draft_order"
  | "finalize_order"
  | "get_order_status";

/** Fire-and-forget tool metering (success or error HTTP status). */
export function scheduleAgentToolMetering(
  supabase: SupabaseClient,
  input: {
    organizationId: string | null;
    restaurantId: string;
    sessionId?: string | null;
    tool: AgentToolMeterTool;
    httpStatus: number;
    skipMetering?: boolean;
    lineCount?: number;
    recordVoiceOrder?: boolean;
    recordOrderCompleted?: boolean;
    orderStatus?: string;
  }
): void {
  if (!input.organizationId || input.skipMetering) return;
  void recordAgentToolMetering(supabase, {
    organizationId: input.organizationId,
    restaurantId: input.restaurantId,
    sessionId: input.sessionId,
    tool: input.tool,
    httpStatus: input.httpStatus,
    lineCount: input.lineCount,
    recordVoiceOrder: input.recordVoiceOrder,
    recordOrderCompleted: input.recordOrderCompleted,
    orderStatus: input.orderStatus,
  });
}

export function createAgentToolMeter(
  supabase: SupabaseClient,
  base: {
    organizationId: string | null;
    restaurantId: string;
    sessionId?: string | null;
    tool: AgentToolMeterTool;
    skipMetering?: boolean;
  }
): (
  httpStatus: number,
  extra?: {
    lineCount?: number;
    recordVoiceOrder?: boolean;
    recordOrderCompleted?: boolean;
    orderStatus?: string;
  }
) => void {
  return (httpStatus, extra) => {
    scheduleAgentToolMetering(supabase, {
      organizationId: base.organizationId,
      restaurantId: base.restaurantId,
      sessionId: base.sessionId,
      tool: base.tool,
      httpStatus,
      skipMetering: base.skipMetering,
      ...extra,
    });
  };
}

export async function recordAgentToolMetering(
  supabase: SupabaseClient,
  input: {
    organizationId: string;
    restaurantId: string;
    sessionId?: string | null;
    tool: AgentToolMeterTool;
    httpStatus: number;
    skipMetering?: boolean;
    lineCount?: number;
    recordVoiceOrder?: boolean;
    recordOrderCompleted?: boolean;
    orderStatus?: string;
  }
): Promise<void> {
  if (input.skipMetering) return;

  const outcome = input.httpStatus >= 200 && input.httpStatus < 300 ? "success" : "error";

  await recordRestaurantUsage(supabase, {
    eventType: "tool_call",
    organizationId: input.organizationId,
    restaurantId: input.restaurantId,
    sessionId: input.sessionId,
    metadata: {
      tool: input.tool,
      http_status: input.httpStatus,
      outcome,
      line_count: input.lineCount,
    },
  });

  if (
    input.recordVoiceOrder &&
    input.sessionId &&
    outcome === "success" &&
    (input.lineCount ?? 0) > 0
  ) {
    await recordUsageEvent(supabase, {
      eventType: "voice_order",
      organizationId: input.organizationId,
      restaurantId: input.restaurantId,
      sessionId: input.sessionId,
      idempotencyKey: `voice_order:${input.restaurantId}:${input.sessionId}`,
      metadata: {
        session_id: input.sessionId,
        line_count: input.lineCount,
        status: input.orderStatus ?? "draft",
      },
    });
    await recordActiveLocation(supabase, input.organizationId, input.restaurantId);
  }

  if (input.recordOrderCompleted && input.sessionId && outcome === "success") {
    await recordUsageEvent(supabase, {
      eventType: "order_completed",
      organizationId: input.organizationId,
      restaurantId: input.restaurantId,
      sessionId: input.sessionId,
      idempotencyKey: `order_completed:${input.restaurantId}:${input.sessionId}`,
      metadata: {
        session_id: input.sessionId,
        line_count: input.lineCount ?? 0,
        order_status: input.orderStatus ?? "new",
      },
    });
    await recordActiveLocation(supabase, input.organizationId, input.restaurantId);
  }
}
