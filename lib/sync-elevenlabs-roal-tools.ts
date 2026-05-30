import {
  requireElevenLabsAgentId,
  requireRoalToolSecrets,
} from "@/lib/env.server";
import {
  createConvaiTool,
  getConvaiAgent,
  getElevenLabsApiKey,
  listAllConvaiTools,
  patchConvaiAgent,
  patchConvaiTool,
} from "@/lib/elevenlabs";
import { buildAgentToolRequestHeaders } from "@/lib/agent-tools/headers";
import { buildRestaurantOrderFirstMessage } from "@/lib/elevenlabs/agent-prompt";
import {
  mergeRestaurantPlaceholders,
  readAgentDynamicPlaceholders,
} from "@/lib/elevenlabs-placeholders";
import { getRestaurantProfile } from "@/lib/restaurant-profile/helpers";
import { getServiceRoleSupabase } from "@/lib/supabase/server";

/** Sent on every webhook call when tools are baked to a restaurant (Twilio cannot resolve conv dynamic vars). */
export const ROAL_RESTAURANT_ID_HEADER = "x-roal-restaurant-id";

const LINE_ITEM_BODY = {
  type: "object",
  description: "One cart line",
  required: ["name", "quantity"],
  properties: {
    name: { type: "string", description: "Item name" },
    quantity: { type: "integer", description: "Quantity" },
    customizations: {
      type: "array",
      description: "Modifier strings",
      items: { type: "string", description: "One customization" },
    },
  },
} as const;

const SESSION_ID_PROP = {
  type: "string",
  description: "Stable session id (e.g. ElevenLabs conversation id)",
} as const;

const STATUS_PROP = {
  type: "string",
  description:
    'Use "draft" while the caller is building the cart. Legacy "confirmed" is accepted but stored as "new".',
  enum: ["draft", "confirmed"],
} as const;

const ITEMS_PROP = {
  type: "array",
  description: "Full current cart; may be empty array",
  items: LINE_ITEM_BODY,
} as const;

const CUSTOMER_NAME_PROP = {
  type: "string",
  description:
    "Guest's real name as they said it on the call. Omit if unknown. Never fabricate, guess, or use placeholder names (e.g. John Doe).",
} as const;

const CUSTOMER_PHONE_PROP = {
  type: "string",
  description:
    "Guest's real callback number as they said it. Omit if unknown. Never invent, example, or placeholder numbers.",
} as const;

const FINALIZE_ITEMS_PROP = {
  type: "array",
  description: "Optional line items",
  items: LINE_ITEM_BODY,
} as const;

function syncDraftBodySpec(mode: "baked" | "dynamic") {
  const baseProps = {
    session_id: SESSION_ID_PROP,
    status: STATUS_PROP,
    items: ITEMS_PROP,
    customer_name: CUSTOMER_NAME_PROP,
    customer_phone: CUSTOMER_PHONE_PROP,
  };
  if (mode === "baked") {
    return {
      type: "object",
      description:
        "Updates the live draft order row for this call. Call whenever the guest changes the cart; use status draft while ordering. Restaurant is fixed for this agent.",
      required: ["session_id", "status", "items"],
      properties: baseProps,
    };
  }
  return {
    type: "object",
    description: "Upsert live draft order for KDS",
    required: ["restaurant_id", "session_id", "status", "items"],
    properties: {
      restaurant_id: {
        type: "string",
        dynamic_variable: "restaurant_id",
      },
      restaurant_name: {
        type: "string",
        dynamic_variable: "restaurant_name",
      },
      ...baseProps,
    },
  };
}

function finalizeBodySpec(mode: "baked" | "dynamic") {
  const baseProps = {
    session_id: SESSION_ID_PROP,
    customer_name: {
      type: "string",
      description:
        "Exact name the caller stated after you asked. Required. Never use placeholders, training examples, or assumed names.",
    },
    customer_phone: {
      type: "string",
      description:
        "Exact phone the caller stated after you asked. Required. Never use fake, example, or assumed numbers; if missing, ask the caller—do not call this tool.",
    },
    items: FINALIZE_ITEMS_PROP,
  };
  if (mode === "baked") {
    return {
      type: "object",
      description:
        "Confirms the order with the caller's real name and phone only. Restaurant is fixed for this agent. Do not call until the guest has clearly provided both values.",
      required: ["session_id", "customer_name", "customer_phone"],
      properties: baseProps,
    };
  }
  return {
    type: "object",
    description:
      "Confirm order with authentic guest identity only; items optional if draft already synced. If name or phone was not spoken by the caller, ask first—do not call.",
    required: [
      "restaurant_id",
      "session_id",
      "customer_name",
      "customer_phone",
    ],
    properties: {
      restaurant_id: {
        type: "string",
        dynamic_variable: "restaurant_id",
      },
      restaurant_name: {
        type: "string",
        dynamic_variable: "restaurant_name",
      },
      ...baseProps,
    },
  };
}

function readToolId(res: unknown): string {
  if (
    res &&
    typeof res === "object" &&
    "id" in res &&
    typeof (res as { id: unknown }).id === "string"
  ) {
    return (res as { id: string }).id;
  }
  throw new Error("Unexpected ElevenLabs tool response (missing id)");
}

function readPromptToolIds(agent: unknown): string[] {
  if (!agent || typeof agent !== "object") return [];
  const conv = (agent as Record<string, unknown>).conversation_config;
  if (!conv || typeof conv !== "object") return [];
  const ag = (conv as Record<string, unknown>).agent;
  if (!ag || typeof ag !== "object") return [];
  const pr = (ag as Record<string, unknown>).prompt;
  if (!pr || typeof pr !== "object") return [];
  const ids = (pr as Record<string, unknown>).tool_ids;
  if (!Array.isArray(ids)) return [];
  return ids.filter((x): x is string => typeof x === "string");
}

function firstWebhookToolIdByName(
  tools: { id: string; tool_config?: { type?: string; name?: string } }[],
  name: string
): string | undefined {
  for (const t of tools) {
    if (t.tool_config?.type === "webhook" && t.tool_config?.name === name) {
      return t.id;
    }
  }
  return undefined;
}

export type SyncRoalElevenLabsToolsResult = {
  ok: true;
  agent_id: string;
  tools: { name: string; id: string; op: "created" | "updated" }[];
  tool_ids_on_agent: string[];
  /** True when KDS passed restaurant and agent placeholders were PATCHed */
  restaurant_placeholders_updated: boolean;
  /** True when first_message was PATCHed to a literal restaurant name (no {{}}). */
  first_message_updated: boolean;
  /** Tools omit dynamic_variable for restaurant fields (Twilio-safe). */
  restaurant_tools_baked: boolean;
};

/**
 * Creates or updates the three ROAL webhook tools in ElevenLabs and attaches
 * their ids to the Conv AI agent prompt.tool_ids.
 *
 * When `restaurantId` is set (KDS / API), tools embed that restaurant in the
 * get-menu URL and `x-roal-restaurant-id` header so phone/Twilio sessions do
 * not need conversation dynamic variables for tools.
 */
export async function syncRoalElevenLabsTools(options?: {
  agentId?: string | null;
  restaurantId?: string;
  restaurantName?: string;
}): Promise<SyncRoalElevenLabsToolsResult> {
  getElevenLabsApiKey();
  const agentId = requireElevenLabsAgentId(options?.agentId);
  const { agentToolSecret, supabaseAnonKey, edgeBase } = requireRoalToolSecrets();

  const rid = options?.restaurantId?.trim() ?? "";
  const rname = options?.restaurantName ?? "";
  const baked = rid.length > 0;
  const resolvedName = mergeRestaurantPlaceholders({}, rid, rname).restaurant_name;

  const edgeHeaders = baked
    ? buildAgentToolRequestHeaders({
        restaurantId: rid,
        agentId,
        supabaseAnonKey,
        legacySecret: agentToolSecret,
      })
    : {
        Authorization: `Bearer ${agentToolSecret}`,
        apikey: supabaseAnonKey,
      };

  const toolNames = [
    "get_menu_items",
    "sync_draft_order",
    "finalize_order",
  ] as const;

  const toolMode = baked ? "baked" : "dynamic";

  const toolConfigs: Record<
    (typeof toolNames)[number],
    Record<string, unknown>
  > = {
    get_menu_items: baked
      ? {
          type: "webhook",
          name: "get_menu_items",
          description:
            "Fetches the live menu for this restaurant from Supabase. Invoke immediately when the session starts (first model turn, ideally while the guest answers pickup/delivery). Do not tell the guest you are loading or pulling up the menu. No parameters required.",
          response_timeout_secs: 45,
          api_schema: {
            url: `${edgeBase}/functions/v1/get-menu?restaurant_id=${encodeURIComponent(rid)}&restaurant_name=${encodeURIComponent(resolvedName)}`,
            method: "GET",
            request_headers: edgeHeaders,
          },
        }
      : {
          type: "webhook",
          name: "get_menu_items",
          description:
            "Fetches the live menu from Supabase. Invoke immediately at session start—before filler speech—while the guest may still be answering pickup/delivery. Do not announce loading or menu fetch to the caller. Requires conversation dynamic variables restaurant_id (uuid) and restaurant_name (spoken name). Response JSON includes restaurant.name for greetings.",
          response_timeout_secs: 45,
          api_schema: {
            url: `${edgeBase}/functions/v1/get-menu`,
            method: "GET",
            request_headers: edgeHeaders,
            query_params_schema: {
              properties: {
                restaurant_id: {
                  type: "string",
                  dynamic_variable: "restaurant_id",
                },
                restaurant_name: {
                  type: "string",
                  dynamic_variable: "restaurant_name",
                },
              },
              required: ["restaurant_id"],
            },
          },
        },
    sync_draft_order: {
      type: "webhook",
      name: "sync_draft_order",
      description: baked
        ? "Updates the live draft order for this restaurant. Pass session_id, status, items. restaurant_id is implicit."
        : "Updates the live draft order row for this call. Call whenever the guest changes the cart; use status draft while ordering.",
      response_timeout_secs: 45,
      api_schema: {
        url: baked
          ? `${edgeBase}/functions/v1/sync-draft-order?restaurant_id=${encodeURIComponent(rid)}`
          : `${edgeBase}/functions/v1/sync-draft-order`,
        method: "POST",
        content_type: "application/json",
        request_headers: {
          ...edgeHeaders,
          "Content-Type": "application/json",
        },
        request_body_schema: syncDraftBodySpec(toolMode),
      },
    },
    finalize_order: {
      type: "webhook",
      name: "finalize_order",
      description: baked
        ? "Confirms the order for this restaurant. Pass session_id, customer_name, customer_phone; items optional if draft exists."
        : "Confirms the order with guest name and phone. Call after the cart is synced; items optional if sync_draft_order already saved them.",
      response_timeout_secs: 45,
      api_schema: {
        url: baked
          ? `${edgeBase}/functions/v1/finalize-order?restaurant_id=${encodeURIComponent(rid)}`
          : `${edgeBase}/functions/v1/finalize-order`,
        method: "POST",
        content_type: "application/json",
        request_headers: {
          ...edgeHeaders,
          "Content-Type": "application/json",
        },
        request_body_schema: finalizeBodySpec(toolMode),
      },
    },
  };

  const existing = await listAllConvaiTools();
  const results: { name: string; id: string; op: "created" | "updated" }[] = [];

  for (const name of toolNames) {
    const tool_config = toolConfigs[name];
    const payload = { tool_config };
    const existingId = firstWebhookToolIdByName(existing, name);
    let raw: unknown;
    let op: "created" | "updated";
    if (existingId) {
      raw = await patchConvaiTool(existingId, payload);
      op = "updated";
    } else {
      raw = await createConvaiTool(payload);
      op = "created";
    }
    results.push({ name, id: readToolId(raw), op });
  }

  const agent = await getConvaiAgent(agentId);
  const cur = readPromptToolIds(agent);
  const newIds = results.map((r) => r.id);
  const merged = [...new Set([...cur, ...newIds])];

  const updatePlaceholders = Boolean(rid);

  const agentPatch: Record<string, unknown> = {
    prompt: {
      tool_ids: merged,
    },
  };

  let firstMessageUpdated = false;
  if (updatePlaceholders && rid) {
    const prev = readAgentDynamicPlaceholders(agent);
    agentPatch.dynamic_variables = {
      dynamic_variable_placeholders: mergeRestaurantPlaceholders(
        prev,
        rid,
        rname
      ),
    };

    let profile = null;
    try {
      const supabase = getServiceRoleSupabase();
      if (supabase) {
        profile = await getRestaurantProfile(supabase, rid);
      }
    } catch {
      // Profile load is best-effort during tool sync.
    }
    agentPatch.first_message = buildRestaurantOrderFirstMessage(profile, rname);
    firstMessageUpdated = true;
  }

  await patchConvaiAgent(agentId, {
    conversation_config: {
      agent: agentPatch,
    },
  });

  return {
    ok: true,
    agent_id: agentId,
    tools: results,
    tool_ids_on_agent: merged,
    restaurant_placeholders_updated: updatePlaceholders,
    first_message_updated: firstMessageUpdated,
    restaurant_tools_baked: baked,
  };
}
