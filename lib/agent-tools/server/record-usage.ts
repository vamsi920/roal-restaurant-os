import type { Db } from "@/lib/db";
import {
  recordActiveLocation,
  recordRestaurantUsage,
  recordUsageEvent,
  resolveRestaurantOrganizationId,
} from "@/lib/usage/record";

export { resolveRestaurantOrganizationId };

export type AgentToolMeterTool =
  | "get_menu_items"
  | "get_restaurant_info"
  | "get_caller_history"
  | "submit_reservation_request"
  | "sync_draft_order"
  | "finalize_order"
  | "get_order_status";

export type AgentToolMeterExtra = {
  lineCount?: number;
  recordVoiceOrder?: boolean;
  recordOrderCompleted?: boolean;
  orderStatus?: string;
};

export type AgentToolMeter = (httpStatus: number, extra?: AgentToolMeterExtra) => void;

/** Persist usage_events for one tool call (tool_call + optional voice_order / order_completed). */
export async function recordAgentToolMetering(
  db: Db,
  input: {
    organizationId: string;
    restaurantId: string;
    sessionId?: string | null;
    tool: AgentToolMeterTool;
    httpStatus: number;
    skipMetering?: boolean;
  } & AgentToolMeterExtra
): Promise<void> {
  if (input.skipMetering) return;

  const outcome = input.httpStatus >= 200 && input.httpStatus < 300 ? "success" : "error";

  await recordRestaurantUsage(db, {
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

  const scope = { organizationId: input.organizationId, restaurantId: input.restaurantId };

  if (input.recordVoiceOrder && input.sessionId && outcome === "success" && (input.lineCount ?? 0) > 0) {
    await recordUsageEvent(db, {
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
    await recordActiveLocation(db, scope);
  }

  if (input.recordOrderCompleted && input.sessionId && outcome === "success" && (input.lineCount ?? 0) > 0) {
    await recordUsageEvent(db, {
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
    await recordActiveLocation(db, scope);
  }
}

/** Pending metering writes — awaited by tests via flushAgentToolMetering(). */
const pending = new Set<Promise<void>>();

/** Fire-and-forget tool metering (success or error HTTP status). Never throws. */
export function scheduleAgentToolMetering(
  db: Db,
  input: {
    organizationId: string | null;
    restaurantId: string;
    sessionId?: string | null;
    tool: AgentToolMeterTool;
    httpStatus: number;
    skipMetering?: boolean;
  } & AgentToolMeterExtra
): void {
  if (!input.organizationId || input.skipMetering) return;
  const p = recordAgentToolMetering(db, { ...input, organizationId: input.organizationId })
    .catch((e) => {
      console.error("[agent-tools] metering failed", input.tool, e instanceof Error ? e.message : e);
    })
    .finally(() => {
      pending.delete(p);
    });
  pending.add(p);
}

export async function flushAgentToolMetering(): Promise<void> {
  while (pending.size > 0) {
    await Promise.all([...pending]);
  }
}

export function createAgentToolMeter(
  db: Db,
  base: {
    organizationId: string | null;
    restaurantId: string;
    sessionId?: string | null;
    tool: AgentToolMeterTool;
    skipMetering?: boolean;
  }
): AgentToolMeter {
  return (httpStatus, extra) => {
    scheduleAgentToolMetering(db, {
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
