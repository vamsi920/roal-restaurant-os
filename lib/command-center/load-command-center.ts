import type { SupabaseClient } from "@supabase/supabase-js";
import { loadRestaurantAgentCallSessions } from "@/lib/agent-calls/load-call-sessions";
import {
  buildCompletedOrdersFromReceipts,
  draftLineCountBySession,
  partitionCommandCenterSessions,
} from "@/lib/command-center/partition-command-center";
import type { RestaurantCommandCenterSnapshot } from "@/lib/command-center/types";

export const COMMAND_CENTER_DEFAULT_RANGE_HOURS = 48;

export type LoadRestaurantCommandCenterInput = {
  restaurantId: string;
  restaurantName: string;
  since?: string;
  until?: string;
  rangeHours?: number;
  limits?: {
    active?: number;
    completed?: number;
    failed?: number;
    handoff?: number;
    unknown?: number;
  };
};

export async function loadRestaurantCommandCenter(
  supabase: SupabaseClient,
  input: LoadRestaurantCommandCenterInput
): Promise<RestaurantCommandCenterSnapshot> {
  const restaurantId = input.restaurantId.trim();
  const rangeHours = input.rangeHours ?? COMMAND_CENTER_DEFAULT_RANGE_HOURS;
  const rangeUntil = input.until ?? new Date().toISOString();
  const rangeSince =
    input.since ??
    new Date(Date.now() - rangeHours * 60 * 60 * 1000).toISOString();

  const emptySnapshot = (): RestaurantCommandCenterSnapshot => ({
    restaurantId,
    restaurantName: input.restaurantName,
    linkedAgentId: null,
    rangeSince,
    rangeUntil,
    activeCalls: [],
    completedOrders: [],
    failedCalls: [],
    handoffCalls: [],
    unknownCalls: [],
    counts: {
      active: 0,
      completed: 0,
      failed: 0,
      handoff: 0,
      unknown: 0,
    },
    isEmpty: true,
  });

  if (!restaurantId) return emptySnapshot();

  const limits = input.limits ?? {
    active: 12,
    completed: 20,
    failed: 12,
    handoff: 12,
    unknown: 12,
  };

  const sessionLimit =
    (limits.active ?? 12) +
    (limits.failed ?? 12) +
    (limits.handoff ?? 12) +
    (limits.unknown ?? 12) +
    (limits.completed ?? 20);

  const {
    sessions,
    linkedAgentId,
    receipts,
    usageEvents,
    drafts,
  } = await loadRestaurantAgentCallSessions(supabase, {
    restaurantId,
    since: rangeSince,
    until: rangeUntil,
    limit: sessionLimit,
  });

  const completedOrders = buildCompletedOrdersFromReceipts(receipts);

  return partitionCommandCenterSessions({
    restaurantId,
    restaurantName: input.restaurantName,
    linkedAgentId,
    rangeSince,
    rangeUntil,
    sessions,
    usageEvents,
    draftLineCountBySession: draftLineCountBySession(drafts),
    completedOrders,
    limits,
  });
}
