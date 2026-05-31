import { z } from "zod";

export const RestaurantUpsellRuleInputSchema = z.object({
  trigger_text: z.string().trim().min(2).max(220),
  offer_text: z.string().trim().min(2).max(500),
});

export type RestaurantUpsellRuleInput = z.infer<
  typeof RestaurantUpsellRuleInputSchema
>;

export type RestaurantUpsellRule = RestaurantUpsellRuleInput & {
  id: string;
  organization_id: string;
  restaurant_id: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

const LINE_RE = /^\s*(?:when\s+)?(.+?)\s*(?:=>|->|—|-{2,}|::)\s*(.+?)\s*$/i;

export function parseUpsellRulesText(
  text: string | null | undefined
): RestaurantUpsellRuleInput[] {
  const rules: RestaurantUpsellRuleInput[] = [];
  const seen = new Set<string>();

  for (const rawLine of (text ?? "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = LINE_RE.exec(line);
    if (!match) continue;
    const parsed = RestaurantUpsellRuleInputSchema.safeParse({
      trigger_text: match[1]?.trim() ?? "",
      offer_text: match[2]?.trim() ?? "",
    });
    if (!parsed.success) continue;
    const key = `${parsed.data.trigger_text.toLowerCase()}=>${parsed.data.offer_text.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rules.push(parsed.data);
  }

  return rules.slice(0, 20);
}

export function serializeUpsellRules(
  rules: readonly Pick<RestaurantUpsellRule, "trigger_text" | "offer_text">[]
): string {
  return rules
    .map((rule) => `${rule.trigger_text} => ${rule.offer_text}`)
    .join("\n");
}
