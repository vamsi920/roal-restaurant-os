import {
  getRestaurantAgentTimezone,
  isRoalOrderKbEnabled,
  requireElevenLabsAgentId,
} from "@/lib/env.server";
import {
  createKnowledgeBaseTextDocument,
  getConvaiAgent,
  getElevenLabsApiKey,
  listAllKnowledgeBaseDocuments,
  patchConvaiAgent,
} from "@/lib/elevenlabs";
import {
  mergeRestaurantPlaceholders,
  readAgentDynamicPlaceholders,
} from "@/lib/elevenlabs-placeholders";
import {
  buildRestaurantOrderAgentPrompt,
  buildRestaurantOrderFirstMessage,
  buildRestaurantVoicemailMessage,
  buildRoalKbPlaybook,
} from "@/lib/elevenlabs/agent-prompt";
import { loadMenuPromptSnapshot } from "@/lib/elevenlabs/load-menu-prompt-snapshot";
import { getRestaurantProfile } from "@/lib/restaurant-profile/helpers";
import {
  buildAgentHoursPromptFromBundle,
  loadRestaurantHoursBundle,
} from "@/lib/restaurant-hours/helpers";
import { createServerSupabase, getServiceRoleSupabase } from "@/lib/supabase/server";

/** Default prompt when no restaurant context is loaded (scripts/tests). */
export const RESTAURANT_ORDER_AGENT_PROMPT = buildRestaurantOrderAgentPrompt({
  restaurantName: "the restaurant",
  profile: null,
  hoursPromptSection: null,
  menu: null,
});

/** Default first message for scripts/tests (no mustache templates). */
export const RESTAURANT_ORDER_FIRST_MESSAGE = buildRestaurantOrderFirstMessage(
  null,
  ""
);

const KB_DOC_NAME = "ROAL_order_taker_playbook";
const KB_SEARCH_PREFIX = "ROAL_order_taker_";

async function ensureKbLocator(): Promise<{
  type: "text";
  name: string;
  id: string;
  usage_mode: "auto";
}> {
  const docs = await listAllKnowledgeBaseDocuments({
    search: KB_SEARCH_PREFIX,
  });
  let row = docs.find((d) => d.name === KB_DOC_NAME);
  const playbook = buildRoalKbPlaybook();
  if (!row?.id) {
    row = await createKnowledgeBaseTextDocument(playbook, KB_DOC_NAME);
  }
  return {
    type: "text",
    name: KB_DOC_NAME,
    id: row.id,
    usage_mode: "auto",
  };
}

function dedupeKbLocators(entries: unknown[]): unknown[] {
  const seen = new Set<string>();
  const out: unknown[] = [];
  for (const e of entries) {
    const r = asRecord(e);
    const id = typeof r?.id === "string" ? r.id : null;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(e);
  }
  return out;
}

function asRecord(v: unknown): Record<string, unknown> | undefined {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : void 0;
}

function systemToolLikeEndCall(
  systemToolType: string,
  extraParams?: Record<string, unknown>
): Record<string, unknown> {
  return {
    type: "system",
    name: systemToolType,
    description: "",
    response_timeout_secs: 20,
    disable_interruptions: false,
    force_pre_tool_speech: false,
    pre_tool_speech: "auto",
    assignments: [],
    tool_call_sound: null,
    tool_call_sound_behavior: "auto",
    tool_error_handling_mode: "auto",
    params: {
      system_tool_type: systemToolType,
      ...extraParams,
    },
  };
}

function mergeVoicemailBuiltIns(
  builtIn: unknown,
  voicemailMessage: string
): Record<string, unknown> {
  const base = asRecord(builtIn) ?? {};
  const out = { ...base };
  if (!out.voicemail_detection) {
    out.voicemail_detection = systemToolLikeEndCall("voicemail_detection", {
      voicemail_message: voicemailMessage,
    });
  }
  return out;
}

function stripPromptForPatch(pr: Record<string, unknown>): Record<string, unknown> {
  const next = { ...pr };
  delete next.tools;
  return next;
}

export type ApplyRestaurantProfileResult = {
  ok: true;
  agent_id: string;
  knowledge_base_doc_attached: boolean;
  restaurant_placeholders_updated: boolean;
  patched_keys: string[];
};

/**
 * PATCH agent: order-taker system prompt (profile + hours + menu rules from code),
 * first message, voicemail detection, knowledge playbook doc;
 * preserves LLM, tool_ids, existing KB entries, MCP ids.
 */
export async function applyRestaurantOrderAgentProfile(options?: {
  agentId?: string | null;
  restaurantId?: string;
  restaurantName?: string;
  enableVoicemailDetection?: boolean;
}): Promise<ApplyRestaurantProfileResult> {
  getElevenLabsApiKey();
  const agentId = requireElevenLabsAgentId(options?.agentId);

  const raw = (await getConvaiAgent(agentId)) as Record<string, unknown>;
  const cc = asRecord(raw.conversation_config);
  if (!cc) throw new Error("Agent missing conversation_config");
  const agent = asRecord(cc.agent);
  if (!agent) throw new Error("Agent missing conversation_config.agent");
  const pr = asRecord(agent.prompt);
  if (!pr) throw new Error("Agent missing conversation_config.agent.prompt");

  const restaurantName = options?.restaurantName?.trim() || "the restaurant";
  const rid = options?.restaurantId?.trim();

  let profile = null;
  let hoursPromptSection: string | null = null;
  let menu = null;

  if (rid) {
    try {
      const supabase =
        getServiceRoleSupabase() ?? (await createServerSupabase());
      profile = await getRestaurantProfile(supabase, rid);
      try {
        const hoursBundle = await loadRestaurantHoursBundle(supabase, rid);
        if (hoursBundle) {
          hoursPromptSection = buildAgentHoursPromptFromBundle(hoursBundle);
        }
      } catch {
        // Hours injection is best-effort.
      }
      try {
        menu = await loadMenuPromptSnapshot(supabase, rid);
      } catch {
        // Menu snapshot is best-effort.
      }
    } catch {
      // Profile load is best-effort when DB unavailable.
    }
  }

  const promptText = buildRestaurantOrderAgentPrompt({
    restaurantName,
    profile,
    hoursPromptSection,
    menu,
  });

  const firstMessage = buildRestaurantOrderFirstMessage(profile, restaurantName);
  const voicemailMessage = buildRestaurantVoicemailMessage(restaurantName);

  const nextPr = stripPromptForPatch(pr);
  nextPr.prompt = promptText;
  nextPr.temperature = 0.25;
  nextPr.enable_parallel_tool_calls = false;

  const tz = getRestaurantAgentTimezone();
  if (tz) nextPr.timezone = tz;

  if (options?.enableVoicemailDetection !== false) {
    nextPr.built_in_tools = mergeVoicemailBuiltIns(
      pr.built_in_tools,
      voicemailMessage
    );
  }

  const lang =
    typeof agent.language === "string" && agent.language.length > 0
      ? agent.language
      : "en";

  let kbAttached = false;
  if (isRoalOrderKbEnabled()) {
    const loc = await ensureKbLocator();
    const prev = Array.isArray(pr.knowledge_base) ? pr.knowledge_base : [];
    const merged = dedupeKbLocators([...prev, loc]);
    nextPr.knowledge_base = merged;
    kbAttached = !prev.some((x) => asRecord(x)?.id === loc.id);
  }

  const body: Record<string, unknown> = {
    conversation_config: {
      agent: {
        first_message: firstMessage,
        language: lang,
        prompt: nextPr,
      },
    },
  };

  let placeholdersUpdated = false;
  if (rid) {
    const agentBlock = body.conversation_config as Record<string, unknown>;
    const inner = agentBlock.agent as Record<string, unknown>;
    inner.dynamic_variables = {
      dynamic_variable_placeholders: mergeRestaurantPlaceholders(
        readAgentDynamicPlaceholders(raw),
        rid,
        restaurantName
      ),
    };
    placeholdersUpdated = true;
  }

  await patchConvaiAgent(agentId, body);

  return {
    ok: true,
    agent_id: agentId,
    knowledge_base_doc_attached: kbAttached,
    restaurant_placeholders_updated: placeholdersUpdated,
    patched_keys: [
      "conversation_config.agent.first_message",
      "conversation_config.agent.prompt.prompt",
      "conversation_config.agent.prompt.temperature",
      "conversation_config.agent.prompt.enable_parallel_tool_calls",
      "conversation_config.agent.prompt.built_in_tools.voicemail_detection?",
      "conversation_config.agent.prompt.timezone?",
      "conversation_config.agent.prompt.knowledge_base?",
      "conversation_config.agent.dynamic_variables?",
    ],
  };
}
