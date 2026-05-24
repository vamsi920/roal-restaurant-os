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

export async function scanMenuImage(
  imageBase64: string,
  mimeType: string
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

      const result = await generativeModel.generateContent([
        { text: VISION_PROMPT },
        { inlineData: { data: imageBase64, mimeType } },
      ]);

      return {
        data: parseJsonResponse(result.response.text()),
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
