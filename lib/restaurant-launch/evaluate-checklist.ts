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
  RestaurantLaunchChecklistSnapshot,
} from "@/lib/restaurant-launch/types";
import type { RestaurantProfile } from "@/lib/types";

const ROAL_TOOL_NAMES = [
  "get_menu_items",
  "sync_draft_order",
  "finalize_order",
] as const;

export type LaunchChecklistInput = {
  restaurantId: string;
  restaurantName: string;
  profile: RestaurantProfile | null;
  menuItemCount: number;
  hoursConfigured: boolean;
  testCallPassed: boolean;
  syncSummary: VoiceAgentSyncSummary | null;
  lastSyncError: string | null;
  phoneWebhookFromAgent: string | null;
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
  profile: RestaurantProfile | null
): boolean {
  if (!profile?.elevenlabs_agent_id?.trim()) return false;
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
  const agentOk = isDedicatedAgentProvisioned(input.profile);
  const toolsOk = areToolsSynced(input.syncSummary, input.lastSyncError);
  const webhookOk = isConversationInitWebhookSet({
    syncSummary: input.syncSummary,
    phoneWebhookFromAgent: input.phoneWebhookFromAgent,
  });
  const testOk = input.testCallPassed;

  const specs: Array<{
    id: LaunchChecklistItemId;
    label: string;
    status: LaunchChecklistStatus;
    detail?: string;
  }> = [
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
      status: agentOk ? "ok" : input.profile?.elevenlabs_provision_status === "failed" ? "error" : "pending",
      detail: agentOk
        ? undefined
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
        ? "Test order recorded or step marked complete."
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
