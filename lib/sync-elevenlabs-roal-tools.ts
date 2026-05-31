import {
  getElevenLabsAgentId,
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

/** Canonical ROAL ConvAI webhook tools attached per dedicated restaurant agent. */
export const ROAL_BAKED_TOOL_NAMES = [
  "get_menu_items",
  "get_restaurant_info",
  "get_caller_history",
  "submit_reservation_request",
  "sync_draft_order",
  "finalize_order",
  "get_order_status",
] as const;

export type RoalBakedToolName = (typeof ROAL_BAKED_TOOL_NAMES)[number];

const LINE_ITEM_BODY = {
  type: "object",
  description:
    "One cart line from get_menu_items. Prefer item_id on multilingual calls.",
  properties: {
    item_id: {
      type: "string",
      description:
        "UUID from get_menu_items. Preferred on multilingual calls—never translate or invent.",
    },
    name: {
      type: "string",
      description:
        "Exact canonical menu name from get_menu_items (as stored, typically English). Never translate for tools.",
    },
    quantity: { type: "integer", description: "Quantity" },
    customizations: {
      type: "array",
      description:
        "Exact modifier strings from get_menu_items, not translated.",
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

const FULFILLMENT_TYPE_PROP = {
  type: "string",
  enum: ["pickup", "delivery"],
  description:
    'The guest-selected fulfillment mode. Use "pickup" or "delivery" only after the guest chooses.',
} as const;

const DELIVERY_ADDRESS_PROP = {
  type: "string",
  description:
    "Full delivery address exactly as the guest stated it. Required for delivery before finalize_order. Never invent or use placeholder addresses.",
} as const;

const DELIVERY_INSTRUCTIONS_PROP = {
  type: "string",
  description:
    "Optional delivery note exactly as stated, such as suite, gate code, or leave-at-door instructions.",
} as const;

const FINALIZE_ITEMS_PROP = {
  type: "array",
  description: "Optional line items",
  items: LINE_ITEM_BODY,
} as const;

const ORDER_STATUS_CUSTOMER_PHONE_PROP = {
  type: "string",
  description:
    "Phone number the guest says is tied to the pickup order. Prefer this for lookup. Never invent or use placeholder numbers.",
} as const;

const ORDER_STATUS_CUSTOMER_NAME_PROP = {
  type: "string",
  description:
    "Guest name tied to the pickup order. Use only if the guest stated it; phone is more reliable when available.",
} as const;

function syncDraftBodySpec(mode: "baked" | "dynamic") {
  const baseProps = {
    session_id: SESSION_ID_PROP,
    status: STATUS_PROP,
    items: ITEMS_PROP,
    customer_name: CUSTOMER_NAME_PROP,
    customer_phone: CUSTOMER_PHONE_PROP,
    fulfillment_type: FULFILLMENT_TYPE_PROP,
    delivery_address: DELIVERY_ADDRESS_PROP,
    delivery_instructions: DELIVERY_INSTRUCTIONS_PROP,
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
    fulfillment_type: FULFILLMENT_TYPE_PROP,
    delivery_address: DELIVERY_ADDRESS_PROP,
    delivery_instructions: DELIVERY_INSTRUCTIONS_PROP,
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

function orderStatusBodySpec(mode: "baked" | "dynamic") {
  const baseProps = {
    session_id: {
      ...SESSION_ID_PROP,
      description:
        "Current or prior ElevenLabs conversation/session id if known. Omit if the guest is asking about an older order and you only have phone/name.",
    },
    customer_phone: ORDER_STATUS_CUSTOMER_PHONE_PROP,
    customer_name: ORDER_STATUS_CUSTOMER_NAME_PROP,
  };
  if (mode === "baked") {
    return {
      type: "object",
      description:
        "Looks up the latest pickup order status for this restaurant by session_id, customer_phone, or customer_name. Restaurant is fixed for this agent.",
      properties: baseProps,
    };
  }
  return {
    type: "object",
    description:
      "Looks up the latest pickup order status by session_id, customer_phone, or customer_name.",
    required: ["restaurant_id"],
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

function callerHistoryBodySpec(mode: "baked" | "dynamic") {
  const baseProps = {
    customer_phone: {
      ...ORDER_STATUS_CUSTOMER_PHONE_PROP,
      description:
        "Phone number the guest stated. Prefer this for recognizing returning callers. Never invent or use placeholder numbers.",
    },
    customer_name: {
      ...ORDER_STATUS_CUSTOMER_NAME_PROP,
      description:
        "Guest name as stated. Use only if the guest stated it and phone is unavailable.",
    },
  };
  if (mode === "baked") {
    return {
      type: "object",
      description:
        "Looks up this restaurant's completed pickup history for a caller by phone or name. Restaurant is fixed for this agent. Use only after the guest states their phone/name or asks for their usual.",
      properties: baseProps,
    };
  }
  return {
    type: "object",
    description:
      "Looks up completed pickup history for a caller by phone or name. Use only after the guest states their phone/name or asks for their usual.",
    required: ["restaurant_id"],
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

function reservationBodySpec(mode: "baked" | "dynamic") {
  const baseProps = {
    session_id: {
      ...SESSION_ID_PROP,
      description:
        "Current ElevenLabs conversation/session id if available. Keep it stable for this call.",
    },
    conversation_id: {
      type: "string",
      description:
        "Optional ElevenLabs conversation id. Use only if available from the call context.",
    },
    customer_name: {
      type: "string",
      description:
        "Guest's real name as they stated it. Required. Never use placeholders or guessed names.",
    },
    customer_phone: {
      type: "string",
      description:
        "Guest's real callback phone number as they stated it. Required. Never use placeholder numbers.",
    },
    party_size: {
      type: "integer",
      description: "Number of guests in the party, 1 to 100.",
    },
    requested_date: {
      type: "string",
      description:
        "Requested reservation date in the guest's words, e.g. 'tonight', 'June 4', or 'next Friday'. Do not invent.",
    },
    requested_time: {
      type: "string",
      description:
        "Requested reservation time in the guest's words, e.g. '7 PM'. Do not invent.",
    },
    notes: {
      type: "string",
      description:
        "Optional short staff note such as occasion, seating preference, or accessibility need.",
    },
  };
  if (mode === "baked") {
    return {
      type: "object",
      description:
        "Saves a reservation request for this restaurant. Restaurant is fixed for this agent. This does not confirm a table; staff must confirm later.",
      required: [
        "customer_name",
        "customer_phone",
        "party_size",
        "requested_date",
        "requested_time",
      ],
      properties: baseProps,
    };
  }
  return {
    type: "object",
    description:
      "Saves a reservation request. This does not confirm a table; staff must confirm later.",
    required: [
      "restaurant_id",
      "customer_name",
      "customer_phone",
      "party_size",
      "requested_date",
      "requested_time",
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
 * Creates or updates the ROAL webhook tools in ElevenLabs and attaches
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
  if (rid) {
    const templateAgentId = getElevenLabsAgentId();
    if (templateAgentId && agentId === templateAgentId) {
      throw new Error(
        "Cannot bake ROAL tools onto the shared template agent. Use the location dedicated ElevenLabs agent."
      );
    }
  }

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

  const toolNames = ROAL_BAKED_TOOL_NAMES;

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
    get_restaurant_info: baked
      ? {
          type: "webhook",
          name: "get_restaurant_info",
          description:
            "Fetches live restaurant business facts for this location: current open/closed status, hours message, address/directions fields, phone, website, service modes, prep-time estimate, and operator FAQ answers. Use for hours, directions, wait-time, policy, reservation, catering, or other non-order questions. FAQ answers may be restated in the guest's language for speech only—never invent facts beyond the response. No parameters required.",
          response_timeout_secs: 30,
          api_schema: {
            url: `${edgeBase}/functions/v1/get-restaurant-info?restaurant_id=${encodeURIComponent(rid)}&restaurant_name=${encodeURIComponent(resolvedName)}`,
            method: "GET",
            request_headers: edgeHeaders,
          },
        }
      : {
          type: "webhook",
          name: "get_restaurant_info",
          description:
            "Fetches live restaurant business facts: current open/closed status, hours message, address/directions fields, phone, website, service modes, prep-time estimate, and operator FAQ answers. Use for hours, directions, wait-time, policy, reservation, catering, or other non-order questions. FAQ answers may be restated in the guest's language for speech only—never invent facts beyond the response.",
          response_timeout_secs: 30,
          api_schema: {
            url: `${edgeBase}/functions/v1/get-restaurant-info`,
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
    get_caller_history: {
      type: "webhook",
      name: "get_caller_history",
      description: baked
        ? "Recognizes returning callers for this restaurant from completed pickup receipts. Use after the guest gives a phone/name or asks for their usual. Do not assume identity or reorder without confirmation."
        : "Recognizes returning callers from completed pickup receipts. Use after the guest gives a phone/name or asks for their usual. Do not assume identity or reorder without confirmation.",
      response_timeout_secs: 30,
      api_schema: {
        url: baked
          ? `${edgeBase}/functions/v1/get-caller-history?restaurant_id=${encodeURIComponent(rid)}`
          : `${edgeBase}/functions/v1/get-caller-history`,
        method: "POST",
        content_type: "application/json",
        request_headers: {
          ...edgeHeaders,
          "Content-Type": "application/json",
        },
        request_body_schema: callerHistoryBodySpec(toolMode),
      },
    },
    submit_reservation_request: {
      type: "webhook",
      name: "submit_reservation_request",
      description: baked
        ? "Saves a reservation request for this restaurant after collecting real name, callback phone, party size, date, and time. It does not confirm a table; staff must confirm later."
        : "Saves a reservation request after collecting real name, callback phone, party size, date, and time. It does not confirm a table; staff must confirm later.",
      response_timeout_secs: 30,
      api_schema: {
        url: baked
          ? `${edgeBase}/functions/v1/submit-reservation-request?restaurant_id=${encodeURIComponent(rid)}`
          : `${edgeBase}/functions/v1/submit-reservation-request`,
        method: "POST",
        content_type: "application/json",
        request_headers: {
          ...edgeHeaders,
          "Content-Type": "application/json",
        },
        request_body_schema: reservationBodySpec(toolMode),
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
    get_order_status: {
      type: "webhook",
      name: "get_order_status",
      description: baked
        ? "Checks the latest pickup order status for this restaurant. Use when a caller asks if an order is ready, being prepared, completed, or canceled. Ask for phone number if needed."
        : "Checks the latest pickup order status. Use when a caller asks if an order is ready, being prepared, completed, or canceled. Ask for phone number if needed.",
      response_timeout_secs: 30,
      api_schema: {
        url: baked
          ? `${edgeBase}/functions/v1/get-order-status?restaurant_id=${encodeURIComponent(rid)}`
          : `${edgeBase}/functions/v1/get-order-status`,
        method: "POST",
        content_type: "application/json",
        request_headers: {
          ...edgeHeaders,
          "Content-Type": "application/json",
        },
        request_body_schema: orderStatusBodySpec(toolMode),
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
