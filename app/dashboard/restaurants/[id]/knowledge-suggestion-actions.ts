"use server";

import { requireRestaurantAccess } from "@/lib/auth/context-server";
import { getDb } from "@/lib/db";
import {
  RestaurantKnowledgeCategorySchema,
  type RestaurantKnowledgeCategory,
} from "@/lib/restaurant-knowledge/schema";
import { afterRestaurantKnowledgeMutation } from "@/lib/voice-agent/after-restaurant-settings-mutation";

export type AcceptKnowledgeSuggestionInput = {
  suggestionId: string;
  question: string;
  answer: string;
  category?: string;
};

function accessError(status: number): never {
  if (status === 401) throw new Error("Sign in to review suggestions.");
  if (status === 404) throw new Error("Restaurant not found.");
  throw new Error("You do not have access to this restaurant.");
}

function parseCategory(value: string | undefined): RestaurantKnowledgeCategory {
  const parsed = RestaurantKnowledgeCategorySchema.safeParse(value?.trim().toLowerCase());
  return parsed.success ? parsed.data : "general";
}

/**
 * Turn a pending suggestion into a live knowledge entry, mark it accepted, and
 * re-sync the agent prompt + knowledge doc (same path as the FAQ editor save).
 */
export async function acceptKnowledgeSuggestionAction(
  restaurantId: string,
  raw: AcceptKnowledgeSuggestionInput
): Promise<{ ok: true; entryId: string }> {
  const access = await requireRestaurantAccess(restaurantId);
  if (access.errorResponse) accessError(access.errorResponse.status);

  const question = raw.question.trim().slice(0, 220);
  const answer = raw.answer.trim().slice(0, 1200);
  if (!question) throw new Error("Add the question your host should recognize.");
  if (!answer) throw new Error("Add the answer your host should give.");

  const supabase = getDb();
  const organizationId = access.access.restaurant.organization_id;

  const { data: suggestion, error: loadError } = await supabase
    .from("restaurant_knowledge_suggestions")
    .select("id, status, category")
    .eq("id", raw.suggestionId)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();
  if (loadError) throw new Error(loadError.message);
  if (!suggestion) throw new Error("That suggestion is no longer here.");
  if (suggestion.status !== "pending") {
    throw new Error("That suggestion was already reviewed.");
  }

  const category = parseCategory(raw.category ?? (suggestion.category as string));

  const { count } = await supabase
    .from("restaurant_knowledge_entries")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId);

  const { data: entry, error: insertError } = await supabase
    .from("restaurant_knowledge_entries")
    .insert({
      organization_id: organizationId,
      restaurant_id: restaurantId,
      category,
      question,
      answer,
      is_active: true,
      sort_order: count ?? 0,
    })
    .select("id")
    .single();
  if (insertError) throw new Error(insertError.message);

  const { error: updateError } = await supabase
    .from("restaurant_knowledge_suggestions")
    .update({
      status: "accepted",
      suggested_question: question,
      suggested_answer: answer,
      category,
      updated_at: new Date().toISOString(),
    })
    .eq("id", raw.suggestionId)
    .eq("restaurant_id", restaurantId);
  if (updateError) throw new Error(updateError.message);

  afterRestaurantKnowledgeMutation(restaurantId, {
    userId: access.context.user.id,
    restaurantName: access.access.restaurant.name,
  });

  return { ok: true, entryId: String(entry.id) };
}

export async function dismissKnowledgeSuggestionAction(
  restaurantId: string,
  suggestionId: string
): Promise<{ ok: true }> {
  const access = await requireRestaurantAccess(restaurantId);
  if (access.errorResponse) accessError(access.errorResponse.status);

  const supabase = getDb();
  const { error } = await supabase
    .from("restaurant_knowledge_suggestions")
    .update({ status: "dismissed", updated_at: new Date().toISOString() })
    .eq("id", suggestionId)
    .eq("restaurant_id", restaurantId);
  if (error) throw new Error(error.message);

  return { ok: true };
}
