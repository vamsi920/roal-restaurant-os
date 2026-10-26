import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { requireGeminiEnv } from "@/lib/env.server";

const CONFIDENCE_ENUM = ["high", "medium", "low"] as const;

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
  type: SchemaType.OBJECT,
  properties: {
    categories: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          sort_order: { type: SchemaType.INTEGER },
          confidence: { type: SchemaType.STRING, enum: [...CONFIDENCE_ENUM] },
          items: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                name: { type: SchemaType.STRING },
                description: { type: SchemaType.STRING },
                price: { type: SchemaType.NUMBER },
                base_availability: { type: SchemaType.BOOLEAN },
                confidence: { type: SchemaType.STRING, enum: [...CONFIDENCE_ENUM] },
                name_confidence: {
                  type: SchemaType.STRING,
                  enum: [...CONFIDENCE_ENUM],
                },
                price_confidence: {
                  type: SchemaType.STRING,
                  enum: [...CONFIDENCE_ENUM],
                },
                description_confidence: {
                  type: SchemaType.STRING,
                  enum: [...CONFIDENCE_ENUM],
                },
                modifiers: {
                  type: SchemaType.ARRAY,
                  items: {
                    type: SchemaType.OBJECT,
                    properties: {
                      group_name: { type: SchemaType.STRING },
                      modifier_name: { type: SchemaType.STRING },
                      extra_price: { type: SchemaType.NUMBER },
                      min_selection: { type: SchemaType.INTEGER },
                      max_selection: { type: SchemaType.INTEGER },
                      confidence: {
                        type: SchemaType.STRING,
                        enum: [...CONFIDENCE_ENUM],
                      },
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

const FALLBACK_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-flash-latest",
  "gemini-pro-latest",
  "gemini-2.0-flash-lite",
] as const;

function normalizeModelName(model: string): string {
  return model.trim().replace(/^models\//, "");
}

function getCandidateModels(preferredModel?: string): string[] {
  const preferred = preferredModel?.trim();
  const models = preferred
    ? [normalizeModelName(preferred), ...FALLBACK_MODELS]
    : [...FALLBACK_MODELS];

  return [...new Set(models)];
}

function isMissingModelError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("404") ||
    message.includes("not found") ||
    message.includes("not supported for generatecontent")
  );
}

function parseJsonResponse(text: string) {
  const cleaned = text.trim().replace(/^```json\s*|\s*```$/g, "");
  return JSON.parse(cleaned);
}

export type ScanMenuImageResult = {
  data: unknown;
  modelUsed: string;
};

async function generateMenuJson(
  parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }>
): Promise<ScanMenuImageResult> {
  const { apiKey, model } = requireGeminiEnv();
  const genAI = new GoogleGenerativeAI(apiKey);
  let lastError: unknown;

  for (const modelName of getCandidateModels(model)) {
    try {
      const generativeModel = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: "application/json",
          // @ts-expect-error SDK type narrowing missing for nested schema
          responseSchema: MENU_RESPONSE_SCHEMA,
          temperature: 0.2,
        },
      });

      const result = await generateContentSafe(generativeModel, parts);
      return {
        data: parseJsonResponse(result),
        modelUsed: modelName,
      };
    } catch (error) {
      lastError = error;
      if (!isMissingModelError(error)) throw error;
    }
  }

  const attemptedModels = getCandidateModels().join(", ");
  const lastMessage =
    lastError instanceof Error ? lastError.message : "unknown error";

  throw new Error(
    `No supported Gemini model alias worked. Tried: ${attemptedModels}. ` +
      `Set GEMINI_MODEL in .env to an available model like gemini-2.5-flash. Last error: ${lastMessage}`
  );
}

async function generateContentSafe(
  model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]>,
  parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }>
): Promise<string> {
  const result = await model.generateContent(parts);
  return result.response.text();
}

export async function scanMenuImage(
  imageBase64: string,
  mimeType: string
): Promise<ScanMenuImageResult> {
  return generateMenuJson([
    { text: VISION_PROMPT },
    { inlineData: { data: imageBase64, mimeType } },
  ]);
}

const WEBSITE_MENU_PROMPT = `Extract a restaurant menu from this website text into hierarchical JSON.

Identify categories, items (name, description, price, base_availability), and modifiers.

Rules:
- Do not invent items or prices.
- Numbers are decimals.
- If a price is missing, omit price and set price_confidence to "low".
- Ignore navigation, delivery-app ads, and footer copy.
- If the text is not a menu, return {"categories":[]}.`;

export async function extractMenuFromWebsiteText(
  text: string
): Promise<ScanMenuImageResult> {
  const clipped = text.trim().slice(0, 80_000);
  if (!clipped) {
    return { data: { categories: [] }, modelUsed: "none" };
  }
  return generateMenuJson([{ text: `${WEBSITE_MENU_PROMPT}\n\n${clipped}` }]);
}

/* ------------------------------------------------------------------------- */
/* Generic structured JSON generation (restaurant profile, call insights)     */
/* ------------------------------------------------------------------------- */

export type GenerateJsonResult<T> = { data: T; modelUsed: string };

async function generateJson<T>(
  prompt: string,
  responseSchema: unknown,
  temperature = 0.2
): Promise<GenerateJsonResult<T>> {
  const { apiKey, model } = requireGeminiEnv();
  const genAI = new GoogleGenerativeAI(apiKey);
  let lastError: unknown;

  for (const modelName of getCandidateModels(model)) {
    try {
      const generativeModel = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: "application/json",
          // @ts-expect-error SDK type narrowing missing for nested schema
          responseSchema,
          temperature,
        },
      });
      const text = await generateContentSafe(generativeModel, [{ text: prompt }]);
      return { data: parseJsonResponse(text) as T, modelUsed: modelName };
    } catch (error) {
      lastError = error;
      if (!isMissingModelError(error)) throw error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Gemini generation failed");
}

const RESTAURANT_PROFILE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    is_restaurant: { type: SchemaType.BOOLEAN },
    name: { type: SchemaType.STRING },
    tagline: { type: SchemaType.STRING },
    cuisine: { type: SchemaType.STRING },
    phone: { type: SchemaType.STRING },
    address_line1: { type: SchemaType.STRING },
    city: { type: SchemaType.STRING },
    region: { type: SchemaType.STRING },
    postal_code: { type: SchemaType.STRING },
    country: { type: SchemaType.STRING },
    timezone: { type: SchemaType.STRING },
    offers_delivery: { type: SchemaType.BOOLEAN },
    weekly_hours: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          day_of_week: { type: SchemaType.INTEGER },
          is_closed: { type: SchemaType.BOOLEAN },
          open_time: { type: SchemaType.STRING },
          close_time: { type: SchemaType.STRING },
        },
        required: ["day_of_week", "is_closed"],
      },
    },
    faqs: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          category: { type: SchemaType.STRING },
          question: { type: SchemaType.STRING },
          answer: { type: SchemaType.STRING },
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
    `${RESTAURANT_PROFILE_PROMPT}\n\nSource URL: ${sourceUrl}\n\nWEBSITE TEXT:\n${clipped}`,
    RESTAURANT_PROFILE_SCHEMA,
    0.1
  );
}

const CALL_INSIGHTS_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    unanswered_questions: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          caller_question: { type: SchemaType.STRING },
          suggested_question: { type: SchemaType.STRING },
          suggested_answer: { type: SchemaType.STRING },
          category: { type: SchemaType.STRING },
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
    `${CALL_INSIGHTS_PROMPT}\n\nTRANSCRIPT:\n${transcript}`,
    CALL_INSIGHTS_SCHEMA,
    0.1
  );
}
