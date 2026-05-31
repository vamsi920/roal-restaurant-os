import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  RestaurantKnowledgeEntry,
  RestaurantKnowledgeEntryInput,
} from "@/lib/restaurant-knowledge/schema";

function mapRow(row: Record<string, unknown>): RestaurantKnowledgeEntry {
  return {
    id: String(row.id),
    organization_id: String(row.organization_id),
    restaurant_id: String(row.restaurant_id),
    category: String(row.category) as RestaurantKnowledgeEntry["category"],
    question: String(row.question),
    answer: String(row.answer),
    is_active: Boolean(row.is_active),
    sort_order: Number(row.sort_order ?? 0),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function loadRestaurantKnowledgeEntries(
  supabase: SupabaseClient,
  restaurantId: string,
  options: { activeOnly?: boolean; limit?: number } = {}
): Promise<RestaurantKnowledgeEntry[]> {
  const limit = options.limit ?? 24;
  let query = supabase
    .from("restaurant_knowledge_entries")
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

export async function replaceRestaurantKnowledgeEntries(
  supabase: SupabaseClient,
  input: {
    restaurantId: string;
    organizationId: string;
    entries: Array<
      RestaurantKnowledgeEntryInput & { is_active?: boolean }
    >;
  }
): Promise<RestaurantKnowledgeEntry[]> {
  const { restaurantId, organizationId, entries } = input;
  const { error: deleteError } = await supabase
    .from("restaurant_knowledge_entries")
    .delete()
    .eq("restaurant_id", restaurantId);

  if (deleteError) throw new Error(deleteError.message);
  if (entries.length === 0) return [];

  const rows = entries.map((entry, index) => ({
    organization_id: organizationId,
    restaurant_id: restaurantId,
    category: entry.category,
    question: entry.question,
    answer: entry.answer,
    is_active: entry.is_active ?? true,
    sort_order: index,
  }));

  const { data, error } = await supabase
    .from("restaurant_knowledge_entries")
    .insert(rows)
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return ((data ?? []) as Record<string, unknown>[]).map(mapRow);
}

export function restaurantInfoKnowledgeStatusMessage(entryCount: number): string {
  if (entryCount > 0) {
    return "Use only the knowledge_entries in this response for operator-approved FAQ answers.";
  }
  return "No operator FAQ entries are configured for this location. Do not invent policies, allergens, parking, catering, refund, or reservation answers—use profile address, operations hours, get_menu_items, or offer a staff callback.";
}
