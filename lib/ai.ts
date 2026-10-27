import { requireOpenAIEnv } from "@/lib/env.server";

/**
 * Structured JSON extraction (menus, restaurant profiles, call insights) via OpenAI
 * Chat Completions in JSON mode. Chat Completions rather than the Responses API because
 * only Chat Completions traffic counts toward the data-sharing program's free daily tokens.
 */

const CONFIDENCE = { type: "string", enum: ["high", "medium", "low"] };

const VISION_PROMPT = `Analyze this restaurant menu image. Extract all data into a robust, hierarchical JSON format.

Identify:
1. Main Categories (e.g., 'Starters', 'Mains').
2. Items under each category (name, description, price, base_availability).
3. Modifiers (required choices like 'Meat Temp' or optional 'Add Bacon' with extra prices).

Confidence (required on every category, item, and modifier):
- Set confidence to "high" when text is clear and unambiguous.
- Set confidence to "medium" when slightly blurry, partially cropped, or inferred from context.
- Set confidence to "low" when guessed, heavily occluded, or price/name is uncertain.
- For each item also set name_confidence, price_confidence, and description_confidence when those fields are present.

Rules:
- Numbers are decimals. Resolve obvious OCR typos only when confident.
- Do not invent items. If availability isn't explicit, assume base_availability true.
- If price is missing or unreadable, omit price and set price_confidence to "low".`;

const MENU_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    categories: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          sort_order: { type: "integer" },
          confidence: CONFIDENCE,
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                description: { type: "string" },
                price: { type: "number" },
                base_availability: { type: "boolean" },
                confidence: CONFIDENCE,
                name_confidence: CONFIDENCE,
                price_confidence: CONFIDENCE,
                description_confidence: CONFIDENCE,
                modifiers: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      group_name: { type: "string" },
                      modifier_name: { type: "string" },
                      extra_price: { type: "number" },
                      min_selection: { type: "integer" },
                      max_selection: { type: "integer" },
                      confidence: CONFIDENCE,
                    },
                    required: ["modifier_name"],
                  },
                },
              },
              required: ["name"],
            },
          },
        },
        required: ["name", "items"],
      },
    },
  },
  required: ["categories"],
};

const DEFAULT_MODEL = "gpt-5.4-mini";
/** Small models covered by the free daily token tier, tried in order if one is unavailable. */
const FALLBACK_MODELS = ["gpt-5.4-mini", "gpt-5-mini", "gpt-4.1-mini"] as const;

function getCandidateModels(preferredModel?: string): string[] {
  const preferred = preferredModel?.trim();
  return [...new Set([preferred || DEFAULT_MODEL, ...FALLBACK_MODELS])];
}

function isMissingModelError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return message.includes("model_not_found") || message.includes("does not exist") || message.includes("openai 404");
}

function parseJsonResponse(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  return JSON.parse(start >= 0 && end > start ? text.slice(start, end + 1) : text);
}

type UserContent =
  | string
  | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>;

type OpenAIResponse = {
  choices?: { message?: { content?: string | null }; finish_reason?: string }[];
  error?: { message?: string; code?: string };
};

/** Lowest reasoning effort each model family accepts (gpt-5.1+ takes "none", gpt-5 only "minimal"). */
function fastestEffort(modelName: string): string {
  return /^gpt-5\.\d/.test(modelName) ? "none" : "minimal";
}

async function chatJson(
  modelName: string,
  apiKey: string,
  system: string,
  user: UserContent,
  maxTokens: number,
  temperature: number,
  fast = false
): Promise<string> {
  const reasoning = /^(gpt-5|o\d)/.test(modelName);
  const effort = fast ? fastestEffort(modelName) : process.env.OPENAI_REASONING ?? "low";
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: modelName,
      messages: [
        { role: "system", content: `${system}\nReply with a single JSON object only. No markdown fences, no commentary.` },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: maxTokens + (reasoning ? 4000 : 0),
      // Reasoning models reject temperature; they take an effort level instead.
      ...(reasoning ? { reasoning_effort: effort } : { temperature }),
    }),
  });
  const j = (await r.json().catch(() => ({}))) as OpenAIResponse;
  if (!r.ok) {
    throw new Error(`OpenAI ${r.status}: ${j.error?.code ?? ""} ${j.error?.message ?? "unknown error"}`.trim());
  }
  const choice = j.choices?.[0];
  if (choice?.finish_reason === "length") {
    throw new Error("OpenAI response was cut off before the JSON finished");
  }
  return choice?.message?.content ?? "";
}

export type GenerateJsonResult<T> = { data: T; modelUsed: string };

async function generateJson<T>(
  system: string,
  user: UserContent,
  responseSchema: unknown,
  {
    temperature = 0.2,
    maxTokens = 4000,
    fast = false,
  }: { temperature?: number; maxTokens?: number; fast?: boolean } = {}
): Promise<GenerateJsonResult<T>> {
  const { apiKey, model } = requireOpenAIEnv();
  const prompt = `${system}\n\nThe JSON must match this JSON Schema:\n${JSON.stringify(responseSchema)}`;
  let lastError: unknown;

  for (const modelName of getCandidateModels(model)) {
    try {
      const text = await chatJson(modelName, apiKey, prompt, user, maxTokens, temperature, fast);
      return { data: parseJsonResponse(text) as T, modelUsed: modelName };
    } catch (error) {
      lastError = error;
      if (!isMissingModelError(error)) throw error;
    }
  }

  const lastMessage = lastError instanceof Error ? lastError.message : "unknown error";
  throw new Error(
    `No OpenAI model worked. Tried: ${getCandidateModels(model).join(", ")}. ` +
      `Set OPENAI_MODEL to an available model like ${DEFAULT_MODEL}. Last error: ${lastMessage}`
  );
}

export type ScanMenuImageResult = {
  data: unknown;
  modelUsed: string;
};

export async function scanMenuImage(
  imageBase64: string,
  mimeType: string
): Promise<ScanMenuImageResult> {
  return generateJson(
    VISION_PROMPT,
    [
      { type: "text", text: "Extract the menu from this image." },
      { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
    ],
    MENU_RESPONSE_SCHEMA,
    { maxTokens: 16000 }
  );
}

/**
 * Website menus are extracted in a compact shape (short keys, no confidence fields) because
 * output tokens dominate latency, and long pages are split into chunks extracted in parallel.
 * Together that keeps a 100+ item menu well inside a serverless request budget.
 */
const WEBSITE_MENU_PROMPT = `Extract the restaurant menu from this website text.

Return {"c":[{"n":"Category","i":[{"n":"Item","p":4.99,"d":"Short description","m":[["Add-on",1.5]]}]}]}
- n: name. p: price as a number (omit when not listed). d: description, at most 12 words (omit when none).
- m: optional add-ons or choices listed for that item, as [name, extra price or 0].
- Keep the menu's own category names and order. Do not invent items or prices.
- Ignore navigation, delivery-app ads, catering packages, and footer copy.
- If the text has no menu, return {"c":[]}.`;

const COMPACT_MENU_SCHEMA = {
  type: "object",
  properties: {
    c: {
      type: "array",
      items: {
        type: "object",
        properties: {
          n: { type: "string" },
          i: {
            type: "array",
            items: {
              type: "object",
              properties: {
                n: { type: "string" },
                p: { type: "number" },
                d: { type: "string" },
                m: { type: "array", items: { type: "array" } },
              },
              required: ["n"],
            },
          },
        },
        required: ["n", "i"],
      },
    },
  },
  required: ["c"],
};

type CompactMenu = {
  c?: { n?: string; i?: { n?: string; p?: number; d?: string; m?: unknown[] }[] }[];
};

const MENU_CHUNK_CHARS = 5_000;
const MAX_MENU_CHUNKS = 8;

/** Split on line breaks into roughly even chunks so each parallel call sees whole lines. */
function splitMenuText(text: string): string[] {
  if (text.length <= MENU_CHUNK_CHARS) return [text];
  const count = Math.min(MAX_MENU_CHUNKS, Math.ceil(text.length / MENU_CHUNK_CHARS));
  const target = Math.ceil(text.length / count);
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length && chunks.length < count - 1) {
    const end = text.indexOf("\n", start + target);
    if (end < 0) break;
    chunks.push(text.slice(start, end));
    start = end + 1;
  }
  chunks.push(text.slice(start));
  return chunks.filter((c) => c.trim());
}

function money(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;
}

/** Expand the compact shape into the ScannedMenu shape, merging categories split across chunks. */
function expandCompactMenu(parts: CompactMenu[]) {
  const categories: { name: string; sort_order: number; items: Record<string, unknown>[] }[] = [];
  const byName = new Map<string, (typeof categories)[number]>();
  const seen = new Set<string>();
  for (const part of parts) {
    for (const cat of part.c ?? []) {
      const name = cat.n?.trim();
      if (!name) continue;
      const key = name.toLowerCase().replace(/[^a-z0-9]/g, "");
      let target = byName.get(key);
      if (!target) {
        target = { name, sort_order: categories.length + 1, items: [] };
        byName.set(key, target);
        categories.push(target);
      }
      for (const item of cat.i ?? []) {
        const itemName = item.n?.trim();
        if (!itemName) continue;
        const dedupe = `${key}|${itemName.toLowerCase()}`;
        if (seen.has(dedupe)) continue;
        seen.add(dedupe);
        const modifiers = (Array.isArray(item.m) ? item.m : [])
          .filter((m): m is unknown[] => Array.isArray(m) && typeof m[0] === "string" && Boolean(m[0].trim()))
          .slice(0, 12)
          .map((m) => ({ modifier_name: String(m[0]).trim(), extra_price: money(m[1]) ?? 0 }));
        target.items.push({
          name: itemName,
          ...(item.d?.trim() ? { description: item.d.trim() } : {}),
          ...(money(item.p) !== undefined ? { price: money(item.p) } : {}),
          base_availability: true,
          modifiers,
        });
      }
    }
  }
  return { categories: categories.filter((c) => c.items.length > 0) };
}

export async function extractMenuFromWebsiteText(
  text: string
): Promise<ScanMenuImageResult> {
  const clipped = text.trim().slice(0, 70_000);
  if (!clipped) {
    return { data: { categories: [] }, modelUsed: "none" };
  }
  const chunks = splitMenuText(clipped);
  const results = await Promise.all(
    chunks.map((chunk, idx) =>
      generateJson<CompactMenu>(
        chunks.length > 1
          ? `${WEBSITE_MENU_PROMPT}\n- This is part ${idx + 1} of ${chunks.length} of one page. Extract only what appears in this part.`
          : WEBSITE_MENU_PROMPT,
        chunk,
        COMPACT_MENU_SCHEMA,
        { maxTokens: 8000, fast: true }
      )
    )
  );
  return {
    data: expandCompactMenu(results.map((r) => r.data)),
    modelUsed: results[0]?.modelUsed ?? "none",
  };
}

/* ------------------------------------------------------------------------- */
/* Restaurant profile and call insights                                       */
/* ------------------------------------------------------------------------- */

const RESTAURANT_PROFILE_SCHEMA = {
  type: "object",
  properties: {
    is_restaurant: { type: "boolean" },
    name: { type: "string" },
    tagline: { type: "string" },
    cuisine: { type: "string" },
    phone: { type: "string" },
    address_line1: { type: "string" },
    city: { type: "string" },
    region: { type: "string" },
    postal_code: { type: "string" },
    country: { type: "string" },
    timezone: { type: "string" },
    offers_delivery: { type: "boolean" },
    weekly_hours: {
      type: "array",
      items: {
        type: "object",
        properties: {
          day_of_week: { type: "integer" },
          is_closed: { type: "boolean" },
          open_time: { type: "string" },
          close_time: { type: "string" },
        },
        required: ["day_of_week", "is_closed"],
      },
    },
    faqs: {
      type: "array",
      items: {
        type: "object",
        properties: {
          category: { type: "string" },
          question: { type: "string" },
          answer: { type: "string" },
        },
        required: ["question", "answer"],
      },
    },
  },
  required: ["is_restaurant", "name"],
};

export type ExtractedRestaurantProfile = {
  is_restaurant: boolean;
  name: string;
  tagline?: string;
  cuisine?: string;
  phone?: string;
  address_line1?: string;
  city?: string;
  region?: string;
  postal_code?: string;
  country?: string;
  timezone?: string;
  offers_delivery?: boolean;
  weekly_hours?: Array<{
    day_of_week: number;
    is_closed: boolean;
    open_time?: string;
    close_time?: string;
  }>;
  faqs?: Array<{ category?: string; question: string; answer: string }>;
};

const RESTAURANT_PROFILE_PROMPT = `You are reading the public website text of a restaurant. Extract facts an AI phone host would need.

Rules:
- Only state facts present in the text. Never invent a phone number, address, or hours.
- name: the restaurant's name as customers say it.
- phone: digits with country code if shown.
- weekly_hours: one entry per day_of_week 0 (Sunday) through 6 (Saturday) when hours are listed. Use 24h "HH:MM". If a day is closed set is_closed true. If hours are not on the page, return an empty array.
- timezone: IANA zone inferred from the city/state (e.g. America/Chicago). Omit if unsure.
- offers_delivery: true only if the site clearly says it delivers (not third-party apps).
- faqs: up to 6 short Q&A pairs about parking, reservations, catering, dietary options, payment, or policies that appear in the text. category must be one of general, hours, menu, allergens, directions, policies, handoff.
- is_restaurant: false if the page is clearly not a restaurant.`;

export async function extractRestaurantProfileFromWebsiteText(
  text: string,
  sourceUrl: string
): Promise<GenerateJsonResult<ExtractedRestaurantProfile>> {
  const clipped = text.trim().slice(0, 60_000);
  return generateJson<ExtractedRestaurantProfile>(
    RESTAURANT_PROFILE_PROMPT,
    `Source URL: ${sourceUrl}\n\nWEBSITE TEXT:\n${clipped}`,
    RESTAURANT_PROFILE_SCHEMA,
    { temperature: 0.1 }
  );
}

const CALL_INSIGHTS_SCHEMA = {
  type: "object",
  properties: {
    unanswered_questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          caller_question: { type: "string" },
          suggested_question: { type: "string" },
          suggested_answer: { type: "string" },
          category: { type: "string" },
        },
        required: ["caller_question", "suggested_question"],
      },
    },
  },
  required: ["unanswered_questions"],
};

export type CallInsights = {
  unanswered_questions: Array<{
    caller_question: string;
    suggested_question: string;
    suggested_answer?: string;
    category?: string;
  }>;
};

const CALL_INSIGHTS_PROMPT = `Read this restaurant phone call transcript between an AI host (agent) and a caller (user).

Find every question the caller asked that the agent could NOT answer confidently (it said it did not know, did not have that on file, deflected, or guessed). Ignore questions the agent answered with specific facts.

For each, write:
- caller_question: the caller's question in their words (short).
- suggested_question: a clean FAQ-style question the owner could add.
- suggested_answer: leave empty unless the transcript itself contains the answer.
- category: one of general, hours, menu, allergens, directions, policies, handoff.

Return at most 5. If nothing qualifies return an empty list.`;

export async function extractCallInsightsFromTranscript(
  turns: Array<{ role: string; text: string }>
): Promise<GenerateJsonResult<CallInsights>> {
  const transcript = turns
    .map((t) => `${t.role === "user" ? "CALLER" : "AGENT"}: ${t.text}`)
    .join("\n")
    .slice(0, 40_000);
  if (!transcript.trim()) {
    return { data: { unanswered_questions: [] }, modelUsed: "none" };
  }
  return generateJson<CallInsights>(
    CALL_INSIGHTS_PROMPT,
    `TRANSCRIPT:\n${transcript}`,
    CALL_INSIGHTS_SCHEMA,
    { temperature: 0.1 }
  );
}
