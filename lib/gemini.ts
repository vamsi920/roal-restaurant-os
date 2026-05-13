import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const VISION_PROMPT = `Analyze this restaurant menu image. Extract all data into a robust, hierarchical JSON format. Identify: 1. Main Categories (e.g., 'Starters', 'Mains'). 2. Items under each category (name, description, price, base_availability). 3. Modifiers (required choices like 'Meat Temp' or optional 'Add Bacon' with extra prices). Ensure all data is clean, numbers are decimals, and you resolve common OCR typos. Do not invent items. If availability isn't explicit, assume 'true'.`;

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
          items: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                name: { type: SchemaType.STRING },
                description: { type: SchemaType.STRING },
                price: { type: SchemaType.NUMBER },
                base_availability: { type: SchemaType.BOOLEAN },
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

function getCandidateModels(): string[] {
  const preferred = process.env.GEMINI_MODEL?.trim();
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

export async function scanMenuImage(imageBase64: string, mimeType: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

  const genAI = new GoogleGenerativeAI(apiKey);
  let lastError: unknown;

  for (const modelName of getCandidateModels()) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: "application/json",
          // @ts-expect-error SDK type narrowing missing for nested schema
          responseSchema: MENU_RESPONSE_SCHEMA,
          temperature: 0.2,
        },
      });

      const result = await model.generateContent([
        { text: VISION_PROMPT },
        { inlineData: { data: imageBase64, mimeType } },
      ]);

      return parseJsonResponse(result.response.text());
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
      `Set GEMINI_MODEL in .env.local to an available model like gemini-2.5-flash. Last error: ${lastMessage}`
  );
}
