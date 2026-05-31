import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  RestaurantUpsellRule,
  RestaurantUpsellRuleInput,
} from "@/lib/restaurant-upsell/schema";

function mapRow(row: Record<string, unknown>): RestaurantUpsellRule {
  return {
    id: String(row.id),
    organization_id: String(row.organization_id),
    restaurant_id: String(row.restaurant_id),
    trigger_text: String(row.trigger_text),
    offer_text: String(row.offer_text),
    is_active: Boolean(row.is_active),
    sort_order: Number(row.sort_order ?? 0),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function loadRestaurantUpsellRules(
  supabase: SupabaseClient,
  restaurantId: string,
  options: { activeOnly?: boolean; limit?: number } = {}
): Promise<RestaurantUpsellRule[]> {
  const limit = options.limit ?? 20;
  let query = supabase
    .from("restaurant_upsell_rules")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(limit);

  if (options.activeOnly ?? true) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return ((data ?? []) as Record<string, unknown>[]).map(mapRow);
}

export async function replaceRestaurantUpsellRules(
  supabase: SupabaseClient,
  input: {
    restaurantId: string;
    organizationId: string;
    rules: RestaurantUpsellRuleInput[];
  }
): Promise<RestaurantUpsellRule[]> {
  const { restaurantId, organizationId, rules } = input;
  const { error: deleteError } = await supabase
    .from("restaurant_upsell_rules")
    .delete()
    .eq("restaurant_id", restaurantId);

  if (deleteError) throw new Error(deleteError.message);
  if (rules.length === 0) return [];

  const rows = rules.map((rule, index) => ({
    organization_id: organizationId,
    restaurant_id: restaurantId,
    trigger_text: rule.trigger_text,
    offer_text: rule.offer_text,
    is_active: true,
    sort_order: index,
  }));

  const { data, error } = await supabase
    .from("restaurant_upsell_rules")
    .insert(rows)
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return ((data ?? []) as Record<string, unknown>[]).map(mapRow);
}
