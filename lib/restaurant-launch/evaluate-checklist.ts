import type { VoiceAgentSyncSummary } from "@/lib/voice-agent/voice-agent-sync-summary";
import {
  restaurantLiveOrdersHref,
  restaurantMenuSetupHref,
  restaurantVoiceAgentHref,
} from "@/lib/voice-agent/provision-display";
import type {
  LaunchChecklistItem,
  LaunchChecklistItemId,
  LaunchChecklistStatus,
  LaunchGatePhase,
  LaunchGateSnapshot,
  RestaurantLaunchChecklistSnapshot,
} from "@/lib/restaurant-launch/types";
import {
  isSharedTemplateAgentLinked,
  topLaunchBlocker,
} from "@/lib/restaurant-launch/server-env";
import type { RestaurantProfile } from "@/lib/types";

const ROAL_TOOL_NAMES = [
  "get_menu_items",
  "get_restaurant_info",
  "get_caller_history",
  "submit_reservation_request",
  "sync_draft_order",
  "finalize_order",
  "get_order_status",
] as const;

export type LaunchChecklistInput = {
  restaurantId: string;
  restaurantName: string;
  profile: RestaurantProfile | null;
  menuItemCount: number;
  hoursConfigured: boolean;
  testCallPassed: boolean;
  testCallDetail?: string;
  syncSummary: VoiceAgentSyncSummary | null;
  lastSyncError: string | null;
  phoneWebhookFromAgent: string | null;
  serverEnvReady: boolean;
  serverEnvDetail?: string | null;
  templateAgentId?: string | null;
};

export function isRestaurantProfileLaunchComplete(
  restaurantName: string,
  profile: RestaurantProfile | null
): boolean {
  if (!profile) return false;
  if (!restaurantName.trim()) return false;
  if (!profile.timezone?.trim()) return false;
  if (!profile.phone?.trim()) return false;
  if (!profile.address_line1?.trim()) return false;
  if (!profile.allows_pickup && !profile.allows_delivery) return false;
  return true;
}

export function isDedicatedAgentProvisioned(
  profile: RestaurantProfile | null,
  templateAgentId?: string | null
): boolean {
  if (!profile?.elevenlabs_agent_id?.trim()) return false;
  if (
    isSharedTemplateAgentLinked(
      profile.elevenlabs_agent_id,
      templateAgentId
    )
  ) {
    return false;
  }
  return profile.elevenlabs_provision_status === "ready";
}

export function parseVoiceAgentSyncSummary(
  raw: unknown
): VoiceAgentSyncSummary | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const tools = Array.isArray(row.tools) ? row.tools : [];
  const parsedTools = tools
    .map((t) => {
      if (!t || typeof t !== "object") return null;
      const tool = t as Record<string, unknown>;
      if (typeof tool.name !== "string" || typeof tool.id !== "string") {
        return null;
      }
      const op = tool.op;
      if (op !== "created" && op !== "updated") return null;
      return { name: tool.name, id: tool.id, op };
    })
    .filter((t): t is VoiceAgentSyncSummary["tools"][number] => t != null);

  return {
    tools: parsedTools,
    tool_ids_on_agent: Array.isArray(row.tool_ids_on_agent)
      ? row.tool_ids_on_agent.filter((id): id is string => typeof id === "string")
      : [],
    restaurant_placeholders_updated: row.restaurant_placeholders_updated === true,
    first_message_updated: row.first_message_updated === true,
    restaurant_tools_baked: row.restaurant_tools_baked === true,
    knowledge_base_doc_attached: row.knowledge_base_doc_attached === true,
    phone_personalization_webhook:
      typeof row.phone_personalization_webhook === "string"
        ? row.phone_personalization_webhook
        : null,
  };
}

export function areToolsSynced(
  summary: VoiceAgentSyncSummary | null,
  lastSyncError: string | null
): boolean {
  if (lastSyncError?.trim()) return false;
  if (!summary?.restaurant_tools_baked) return false;
  const names = new Set(summary.tools.map((t) => t.name));
  return ROAL_TOOL_NAMES.every((n) => names.has(n));
}

export function isConversationInitWebhookSet(input: {
  syncSummary: VoiceAgentSyncSummary | null;
  phoneWebhookFromAgent: string | null;
}): boolean {
  const fromSummary = input.syncSummary?.phone_personalization_webhook?.trim();
  if (fromSummary) return true;
  return Boolean(input.phoneWebhookFromAgent?.trim());
}

function itemHref(restaurantId: string, id: LaunchChecklistItemId): string {
  switch (id) {
    case "profile_complete":
      return restaurantMenuSetupHref(restaurantId);
    case "menu_has_items":
      return restaurantMenuSetupHref(restaurantId);
    case "hours_set":
      return restaurantMenuSetupHref(restaurantId);
    case "server_env_ready":
    case "agent_provisioned":
    case "tools_synced":
    case "conversation_init_webhook":
      return restaurantVoiceAgentHref(restaurantId);
    case "test_call_passed":
      return restaurantVoiceAgentHref(restaurantId);
    default:
      return restaurantLiveOrdersHref(restaurantId);
  }
}

export function buildRestaurantLaunchChecklist(
  input: LaunchChecklistInput
): RestaurantLaunchChecklistSnapshot {
  const profileOk = isRestaurantProfileLaunchComplete(
    input.restaurantName,
    input.profile
  );
  const menuOk = input.menuItemCount > 0;
  const hoursOk = input.hoursConfigured;
  const sharedTemplate = isSharedTemplateAgentLinked(
    input.profile?.elevenlabs_agent_id,
    input.templateAgentId
  );
  const agentOk = isDedicatedAgentProvisioned(
    input.profile,
    input.templateAgentId
  );
  const toolsOk = areToolsSynced(input.syncSummary, input.lastSyncError);
  const webhookOk = isConversationInitWebhookSet({
    syncSummary: input.syncSummary,
    phoneWebhookFromAgent: input.phoneWebhookFromAgent,
  });
  const testOk = input.testCallPassed;
  const serverEnvOk = input.serverEnvReady;

  const specs: Array<{
    id: LaunchChecklistItemId;
    label: string;
    status: LaunchChecklistStatus;
    detail?: string;
  }> = [
    {
      id: "server_env_ready",
      label: "Server environment ready",
      status: serverEnvOk ? "ok" : "error",
      detail: serverEnvOk
        ? undefined
        : input.serverEnvDetail?.trim() ||
          "Server config incomplete — ElevenLabs and Supabase settings required.",
    },
    {
      id: "profile_complete",
      label: "Restaurant profile complete",
      status: profileOk ? "ok" : "pending",
      detail: profileOk
        ? undefined
        : "Name, phone, address, timezone, and pickup or delivery.",
    },
    {
      id: "menu_has_items",
      label: "Menu has items",
      status: menuOk ? "ok" : "pending",
      detail: menuOk
        ? `${input.menuItemCount} item${input.menuItemCount === 1 ? "" : "s"} on menu`
        : "Add at least one menu item in Menu & agent setup.",
    },
    {
      id: "hours_set",
      label: "Hours configured",
      status: hoursOk ? "ok" : "pending",
      detail: hoursOk ? undefined : "Set weekly hours on Menu & agent setup.",
    },
    {
      id: "agent_provisioned",
      label: "Dedicated agent provisioned",
      status: agentOk
        ? "ok"
        : sharedTemplate
          ? "error"
          : input.profile?.elevenlabs_provision_status === "failed"
            ? "error"
            : "pending",
      detail: agentOk
        ? undefined
        : sharedTemplate
          ? "Shared template agent is linked — provision a dedicated agent for this location."
          : input.profile?.elevenlabs_provision_error?.trim() ||
            "Connect on Live Agent to create a dedicated ElevenLabs agent.",
    },
    {
      id: "tools_synced",
      label: "ROAL tools synced to agent",
      status: toolsOk ? "ok" : input.lastSyncError ? "error" : "pending",
      detail: toolsOk
        ? undefined
        : input.lastSyncError?.trim() ||
          "Run Connect & sync on Live Agent.",
    },
    {
      id: "conversation_init_webhook",
      label: "Conversation-init webhook set",
      status: webhookOk ? "ok" : "pending",
      detail: webhookOk
        ? undefined
        : "Re-sync after setting ELEVENLABS_CONVERSATION_INIT_SECRET and app URL.",
    },
    {
      id: "test_call_passed",
      label: "Test call passed",
      status: testOk ? "ok" : "pending",
      detail: testOk
        ? input.testCallDetail || "Test order recorded or step marked complete."
        : "Run a test call on Live Agent and complete a sample order.",
    },
  ];

  const items: LaunchChecklistItem[] = specs.map((spec) => ({
    ...spec,
    href: itemHref(input.restaurantId, spec.id),
  }));

  const completedCount = items.filter((i) => i.status === "ok").length;
  const isLaunchReady = completedCount === items.length;

  return {
    restaurantId: input.restaurantId,
    restaurantName: input.restaurantName,
    items,
    completedCount,
    totalCount: items.length,
    isLaunchReady,
  };
}

const PHASE_LABEL: Record<LaunchGatePhase, string> = {
  ready: "Ready for live calls",
  almost_ready: "Almost ready",
  blocked: "Blocked",
};

function deriveLaunchGatePhase(
  checklist: RestaurantLaunchChecklistSnapshot
): LaunchGatePhase {
  if (checklist.isLaunchReady) return "ready";

  const byId = new Map(checklist.items.map((item) => [item.id, item]));
  const server = byId.get("server_env_ready");
  const agent = byId.get("agent_provisioned");
  const tools = byId.get("tools_synced");

  if (
    server?.status === "error" ||
    agent?.status === "error" ||
    tools?.status === "error"
  ) {
    return "blocked";
  }

  return "almost_ready";
}

export function evaluateLaunchGate(
  checklist: RestaurantLaunchChecklistSnapshot
): LaunchGateSnapshot {
  const phase = deriveLaunchGatePhase(checklist);
  const blocker = topLaunchBlocker(checklist.items);
  const ordersHref = restaurantLiveOrdersHref(checklist.restaurantId);

  const primaryAction = blocker
    ? {
        label:
          blocker.id === "test_call_passed"
            ? "Run test call"
            : blocker.id === "server_env_ready"
              ? "Review server config"
              : blocker.id === "menu_has_items"
                ? "Add menu items"
                : blocker.id === "hours_set"
                  ? "Set weekly hours"
                  : blocker.id === "conversation_init_webhook"
                    ? "Configure webhook"
                    : blocker.id === "agent_provisioned"
                      ? "Finish voice agent setup"
                      : blocker.id === "tools_synced"
                        ? "Fix agent sync"
                        : "Finish setup",
        href: blocker.href,
      }
    : {
        label: "Open orders dashboard",
        href: ordersHref,
      };

  return {
    restaurantId: checklist.restaurantId,
    restaurantName: checklist.restaurantName,
    phase,
    phaseLabel: PHASE_LABEL[phase],
    isLiveReady: checklist.isLaunchReady,
    topBlockerLabel: blocker?.label ?? null,
    topBlockerDetail: blocker?.detail ?? null,
    primaryAction,
    checklist,
  };
}

export function buildRestaurantLaunchGate(
  input: LaunchChecklistInput
): LaunchGateSnapshot {
  return evaluateLaunchGate(buildRestaurantLaunchChecklist(input));
}
