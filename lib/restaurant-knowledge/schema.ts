import { z } from "zod";

export const RESTAURANT_KNOWLEDGE_CATEGORIES = [
  "general",
  "hours",
  "menu",
  "allergens",
  "directions",
  "policies",
  "handoff",
] as const;

export type RestaurantKnowledgeCategory =
  (typeof RESTAURANT_KNOWLEDGE_CATEGORIES)[number];

export const RestaurantKnowledgeCategorySchema = z.enum(
  RESTAURANT_KNOWLEDGE_CATEGORIES
);

export const RestaurantKnowledgeEntryInputSchema = z.object({
  category: RestaurantKnowledgeCategorySchema.default("general"),
  question: z.string().trim().min(2).max(220),
  answer: z.string().trim().min(2).max(1200),
});

export const RestaurantKnowledgeFormEntrySchema =
  RestaurantKnowledgeEntryInputSchema.extend({
    is_active: z.boolean().default(true),
  });

export type RestaurantKnowledgeFormEntry = z.infer<
  typeof RestaurantKnowledgeFormEntrySchema
>;

export type RestaurantKnowledgeEntryInput = z.infer<
  typeof RestaurantKnowledgeEntryInputSchema
>;

export type RestaurantKnowledgeEntry = RestaurantKnowledgeEntryInput & {
  id: string;
  organization_id: string;
  restaurant_id: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

const LINE_RE = /^\s*(?:\[([a-z_ -]+)\]\s*)?(.+?)\s*(?:=>|->|—|-{2,}|::)\s*(.+?)\s*$/;

function normalizeCategory(value: string | undefined): RestaurantKnowledgeCategory {
  if (!value) return "general";
  const normalized = value.trim().toLowerCase().replace(/\s+/g, "_");
  return RestaurantKnowledgeCategorySchema.safeParse(normalized).success
    ? (normalized as RestaurantKnowledgeCategory)
    : "general";
}

export function parseKnowledgeText(
  text: string | null | undefined
): RestaurantKnowledgeEntryInput[] {
  const entries: RestaurantKnowledgeEntryInput[] = [];
  const seen = new Set<string>();
  for (const rawLine of (text ?? "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = LINE_RE.exec(line);
    if (!match) continue;
    const category = normalizeCategory(match[1]);
    const question = match[2]?.trim() ?? "";
    const answer = match[3]?.trim() ?? "";
    const parsed = RestaurantKnowledgeEntryInputSchema.safeParse({
      category,
      question,
      answer,
    });
    if (!parsed.success) continue;
    const key = `${parsed.data.category}:${parsed.data.question.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push(parsed.data);
  }
  return entries.slice(0, 24);
}

export function serializeKnowledgeEntries(
  entries: readonly Pick<
    RestaurantKnowledgeEntry,
    "category" | "question" | "answer" | "is_active"
  >[]
): string {
  return entries
    .filter((entry) => entry.is_active !== false)
    .map((entry) => `[${entry.category}] ${entry.question} => ${entry.answer}`)
    .join("\n");
}
