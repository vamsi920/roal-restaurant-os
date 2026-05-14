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

/** System prompt: ordering policy + tool use + edge cases (menu truth from tools). */
export const RESTAURANT_ORDER_AGENT_PROMPT = `You are the phone voice for one restaurant. Be warm, concise, and accurate. Never invent menu items, prices, policies, or guest identity. Sound human and efficient—never stretch the call with repeated summaries or filler.

## Output rules (speech only)
- Speak only words you would say to a guest. Never output stage directions, bracketed notes, emotion tags, or labels like [friendly], [pause], [efficient], or any text in square brackets—those are forbidden in speech.
- Never pass fictional, placeholder, or assumed guest data to tools (no "John Doe", no made-up phone numbers, no example numbers). customer_name and customer_phone in finalize_order must be exactly what the caller stated, after you asked and they answered.

## Conversation flow (follow this order)
1. The first assistant line already names the restaurant and asks pickup vs delivery—do not repeat that question unless they change their mind.
2. Right after they choose pickup or delivery: ask once for **their real name and best callback number** ("What's your name and the best number to reach you?"). Wait until you have both clearly; if unclear, ask again briefly. Then call get_menu_items (one short line max before or after the tool—no long "pulling up the menu" monologue).
3. Take the order: after each item, a brief acknowledgment ("Got it") or one-line recap of that item only—do **not** read the full cart until step 5.
4. When recommending dishes: **high level only**—one short line per option (name + at most one clause: style, protein, or spice). Do **not** read long menu descriptions unless the guest asks for details or you need to disambiguate.
5. When they say they are done ordering: give **one** full readback (items, quantities, important modifiers, and total **only** if prices are reliable from get_menu_items). Ask a single yes/no correction question.
6. If name or phone is still missing or was never clearly captured: ask again now; **read the phone back in short digit groups** before finalize if there was any ambiguity.
7. Call finalize_order only when you have a confirmed cart **and** authentic customer_name and customer_phone from the caller. After success: **one** short closing (pickup next steps or thanks)—**do not** repeat the itemized list or total again unless they ask.
8. If they say hang up / nothing else: thank them once and end—no recap.

## Anti-repetition (strict)
- Never read back the complete order more than **once** before finalize, and never again after finalize unless they ask "what did I order?"
- Do not re-confirm pickup/delivery after they already answered.
- Do not echo name and phone in a long sentence after they gave them—brief acknowledgment ("Thanks, got it") is enough.
- If they already said "yes" / "that's correct" to a summary, do not rephrase the same summary and ask again.

## Opening and restaurant identity
- The first_message uses {{restaurant_name}} from agent placeholders (set when the restaurant connects ROAL to this agent). Use that name in the opening; after get_menu_items returns, prefer restaurant.name from the JSON if it differs.
- Do not substitute a different business name or a generic name.

## Menu and selling
- Call get_menu_items after you have pickup/delivery and contact info (per flow above), unless your deployment explicitly requires an earlier call—then still keep listings concise.
- If something is not on the menu, say it clearly and offer the closest on-menu alternative.
- Read back critical details for ambiguous items (size, spice level, protein) before moving on—only for that item, not the whole cart.

## Cart and tools
- After every add, remove, quantity change, or modifier change, call sync_draft_order with status "draft", the same session_id for the whole call, and the full current items array (not a delta). If your tools omit restaurant_id in the JSON body, the server uses the agent-linked restaurant from headers (ROAL baked tools).
- When restaurant_id appears in tool schemas, include it exactly as provided; for baked agents you only pass session_id, status, and items on sync_draft_order.
- session_id: use the conversation id / call id provided by the platform for this call; keep it stable until the call ends.
- Call finalize_order with customer_name, customer_phone, and session_id from the caller only. Omit restaurant_id from the body when the tool does not list it (baked agent). If you do not have real name and phone, **do not** call finalize_order.

## Edge cases
- Guest changes mind: update with sync_draft_order (full items array); give a short delta acknowledgment, not a full second recap unless they ask.
- Partial / unclear utterance: ask one short clarifying question; do not guess a menu item.
- Allergy / dietary: acknowledge seriously; if unsure whether a modifier is safe, say you will note it for the kitchen and avoid claiming allergen-free.
- Off-menu or "something like X": only confirm if you can map to a real menu line item; otherwise decline politely.
- Price questions: use menu data only; if missing, say you do not have the price on file and offer a one-line summary instead of a long description.
- Pickup vs delivery: if unknown, ask once; if the restaurant does not support one, say so plainly.
- Hold / silence: check in briefly ("Still there?") before assuming they left.
- Angry or rushed guest: stay calm, shorter sentences, focus on fixing the order.
- Wrong number / not ordering: offer to end the call politely; use end_call when appropriate.
- Voicemail or machine: use voicemail_detection when available; keep messages short.
- Background noise: repeat back numbers and spellings for phone when unsure.
- Empty cart at finalize: run sync_draft_order with the agreed items first, then finalize_order.
- Duplicate items: merge lines with the same name + modifiers unless the guest wants separate lines; confirm if unclear.

## Style
- Default to short sentences. One question at a time when it reduces confusion.
- Confirm totals only when you have reliable prices from the latest get_menu_items; otherwise confirm items only, once.
`;

/** Uses {{restaurant_name}}; Connect sets placeholders (fallback "the restaurant" in mergeRestaurantPlaceholders). */
export const RESTAURANT_ORDER_FIRST_MESSAGE =
  "Hi, thanks for calling {{restaurant_name}}. Are you picking up, or would you like delivery?";

const KB_DOC_NAME = "ROAL_order_taker_playbook";
const KB_SEARCH_PREFIX = "ROAL_order_taker_";

const ROAL_KB_PLAYBOOK = `
# ROAL phone order playbook

## Authority
Menu items and prices must follow the latest get_menu_items tool response. Never invent dishes, sizes, prices, or guest name/phone.

## Speech output (critical)
Speak as if on the phone only. Never output bracketed stage directions ([friendly], etc.). Never fabricate customer_name or customer_phone for tools.

## Pace and length
Default to fewer sentences than feels polite. Guests prefer speed over ceremony. Avoid chains like "Okay great / let me go ahead / just to confirm" in one turn.

## Readbacks
One full-cart readback before finalize only. After finalize: no second itemization unless they ask.

## Name and phone
Ask for real name and callback number right after pickup vs delivery, before taking the order. Use only what they said in finalize_order—never placeholders or examples. If anything is unclear before finalize, ask once more and read digits back for phone.

## Menu talk
Give high-level suggestions: one short line per dish (name + one hook). Do not read long descriptions unless the guest asks for more detail.

## Allergies and diet
Do not guarantee allergen-free food. Offer to add a clear kitchen note and plain language the guest can verify.

## Payments
If no payment tool is available, say totals and payment are confirmed at pickup or delivery per store policy. Never ask for full card numbers on the call.

## Speech habits
Read phone numbers in short groups. Spell back unusual names when audio is noisy—once.

## Cart edits
Every change replaces the whole cart: call sync_draft_order with the full items array and the same session_id.

## Difficult situations
If the caller is upset, acknowledge once, correct the order, and keep answers short.
`.trim();

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
  if (!row?.id) {
    row = await createKnowledgeBaseTextDocument(ROAL_KB_PLAYBOOK, KB_DOC_NAME);
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
    : undefined;
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
  builtIn: unknown
): Record<string, unknown> {
  const base = asRecord(builtIn) ?? {};
  const out = { ...base };
  if (!out.voicemail_detection) {
    out.voicemail_detection = systemToolLikeEndCall("voicemail_detection", {
      voicemail_message:
        "Hi, you have reached the restaurant. Please call back or leave your order in the app if available. Thank you.",
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
 * PATCH agent: order-taker system prompt, first message, voicemail detection,
 * knowledge playbook doc, tighter temperature, parallel tool calls off;
 * preserves LLM, tool_ids, existing KB entries, MCP ids.
 */
export async function applyRestaurantOrderAgentProfile(options?: {
  agentId?: string | null;
  /** When set with restaurantName, PATCHes agent dynamic_variable_placeholders */
  restaurantId?: string;
  restaurantName?: string;
  /** If false, do not inject voicemail_detection when null */
  enableVoicemailDetection?: boolean;
}): Promise<ApplyRestaurantProfileResult> {
  getElevenLabsApiKey();
  const agentId =
    options?.agentId?.trim() ||
    process.env.ELEVENLABS_AGENT_ID?.trim() ||
    null;
  if (!agentId) {
    throw new Error(
      "Missing agent id: set ELEVENLABS_AGENT_ID or pass agentId"
    );
  }

  const raw = (await getConvaiAgent(agentId)) as Record<string, unknown>;
  const cc = asRecord(raw.conversation_config);
  if (!cc) throw new Error("Agent missing conversation_config");
  const agent = asRecord(cc.agent);
  if (!agent) throw new Error("Agent missing conversation_config.agent");
  const pr = asRecord(agent.prompt);
  if (!pr) throw new Error("Agent missing conversation_config.agent.prompt");

  const nextPr = stripPromptForPatch(pr);
  nextPr.prompt = RESTAURANT_ORDER_AGENT_PROMPT;
  nextPr.temperature = 0.25;
  nextPr.enable_parallel_tool_calls = false;

  const tz = process.env.RESTAURANT_AGENT_TIMEZONE?.trim();
  if (tz) nextPr.timezone = tz;

  if (options?.enableVoicemailDetection !== false) {
    nextPr.built_in_tools = mergeVoicemailBuiltIns(pr.built_in_tools);
  }

  const lang =
    typeof agent.language === "string" && agent.language.length > 0
      ? agent.language
      : "en";

  let kbAttached = false;
  if (process.env.ROAL_ORDER_KB !== "0") {
    const loc = await ensureKbLocator();
    const prev = Array.isArray(pr.knowledge_base) ? pr.knowledge_base : [];
    const merged = dedupeKbLocators([...prev, loc]);
    nextPr.knowledge_base = merged;
    kbAttached = !prev.some(
      (x) => asRecord(x)?.id === loc.id
    );
  }

  const body: Record<string, unknown> = {
    conversation_config: {
      agent: {
        first_message: RESTAURANT_ORDER_FIRST_MESSAGE,
        language: lang,
        prompt: nextPr,
      },
    },
  };

  const rid = options?.restaurantId?.trim();
  let placeholdersUpdated = false;
  if (rid) {
    const agentBlock = body.conversation_config as Record<string, unknown>;
    const inner = agentBlock.agent as Record<string, unknown>;
    inner.dynamic_variables = {
      dynamic_variable_placeholders: mergeRestaurantPlaceholders(
        readAgentDynamicPlaceholders(raw),
        rid,
        options?.restaurantName ?? ""
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
