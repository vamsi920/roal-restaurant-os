import type { Db } from "@/lib/db";
import { extractCallInsightsFromTranscript } from "@/lib/gemini";

export type KnowledgeSuggestionStatus = "pending" | "accepted" | "dismissed";

export type KnowledgeSuggestion = {
  id: string;
  organization_id: string;
  restaurant_id: string;
  session_id: string | null;
  caller_question: string;
  suggested_question: string;
  suggested_answer: string | null;
  category: "general" | "hours" | "menu" | "allergens" | "directions" | "policies" | "handoff";
  status: KnowledgeSuggestionStatus;
  times_asked: number;
  created_at: string;
  updated_at: string;
};

const CATEGORIES = new Set(["general", "hours", "menu", "allergens", "directions", "policies", "handoff"]);

function mapRow(row: Record<string, unknown>): KnowledgeSuggestion {
  return {
    id: String(row.id),
    organization_id: String(row.organization_id),
    restaurant_id: String(row.restaurant_id),
    session_id: row.session_id != null ? String(row.session_id) : null,
    caller_question: String(row.caller_question),
    suggested_question: String(row.suggested_question),
    suggested_answer: row.suggested_answer != null ? String(row.suggested_answer) : null,
    category: (CATEGORIES.has(String(row.category)) ? String(row.category) : "general") as KnowledgeSuggestion["category"],
    status: (row.status as KnowledgeSuggestionStatus) ?? "pending",
    times_asked: Number(row.times_asked ?? 1),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function loadKnowledgeSuggestions(
  supabase: Db,
  restaurantId: string,
  options: { status?: KnowledgeSuggestionStatus; limit?: number } = {}
): Promise<KnowledgeSuggestion[]> {
  let query = supabase
    .from("restaurant_knowledge_suggestions")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("times_asked", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(options.limit ?? 20);
  if (options.status) query = query.eq("status", options.status);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return ((data ?? []) as Record<string, unknown>[]).map(mapRow);
}

function normalizeQuestion(q: string): string {
  return q.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}

/** Simple token-overlap similarity (0..1) to merge repeats of the same question. */
export function questionSimilarity(a: string, b: string): number {
  const ta = new Set(normalizeQuestion(a).split(" ").filter((w) => w.length > 2));
  const tb = new Set(normalizeQuestion(b).split(" ").filter((w) => w.length > 2));
  if (ta.size === 0 || tb.size === 0) return 0;
  let shared = 0;
  for (const w of ta) if (tb.has(w)) shared += 1;
  return shared / Math.max(ta.size, tb.size);
}

export type TranscriptTurnLike = { role: string; text: string };

/** Normalize ElevenLabs transcript rows (`{role, message}`) or our own (`{role, text}`). */
export function transcriptTurnsFromRows(rows: unknown): TranscriptTurnLike[] {
  if (!Array.isArray(rows)) return [];
  const out: TranscriptTurnLike[] = [];
  for (const raw of rows) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const role = typeof r.role === "string" ? r.role : "";
    const text =
      typeof r.message === "string" ? r.message : typeof r.text === "string" ? r.text : "";
    if (!role || !text.trim()) continue;
    out.push({ role: role === "user" ? "user" : "agent", text: text.trim() });
  }
  return out;
}

/**
 * Mine a finished call for questions the agent could not answer and store them
 * as pending suggestions (merged with similar pending rows). Best-effort.
 */
export async function mineKnowledgeSuggestionsFromTranscript(
  supabase: Db,
  input: {
    restaurantId: string;
    organizationId: string;
    sessionId: string | null;
    turns: TranscriptTurnLike[];
  }
): Promise<{ created: number; merged: number }> {
  const userTurns = input.turns.filter((t) => t.role === "user");
  if (userTurns.length === 0) return { created: 0, merged: 0 };

  const { data } = await extractCallInsightsFromTranscript(input.turns);
  const found = (data.unanswered_questions ?? []).slice(0, 5);
  if (found.length === 0) return { created: 0, merged: 0 };

  const pending = await loadKnowledgeSuggestions(supabase, input.restaurantId, {
    status: "pending",
    limit: 50,
  });

  let created = 0;
  let merged = 0;
  for (const item of found) {
    const suggestedQuestion = item.suggested_question?.trim().slice(0, 220);
    const callerQuestion = item.caller_question?.trim().slice(0, 500);
    if (!suggestedQuestion || !callerQuestion) continue;

    const match = pending.find(
      (p) => questionSimilarity(p.suggested_question, suggestedQuestion) >= 0.6
    );
    if (match) {
      await supabase
        .from("restaurant_knowledge_suggestions")
        .update({ times_asked: match.times_asked + 1, updated_at: new Date().toISOString() })
        .eq("id", match.id);
      match.times_asked += 1;
      merged += 1;
      continue;
    }

    const category = CATEGORIES.has(item.category ?? "") ? item.category : "general";
    const { error } = await supabase.from("restaurant_knowledge_suggestions").insert({
      organization_id: input.organizationId,
      restaurant_id: input.restaurantId,
      session_id: input.sessionId,
      caller_question: callerQuestion,
      suggested_question: suggestedQuestion,
      suggested_answer: item.suggested_answer?.trim().slice(0, 1200) || null,
      category,
    });
    if (!error) created += 1;
  }
  return { created, merged };
}

/** Cheap head-count of pending suggestions for rail badges. Never throws. */
export async function countPendingKnowledgeSuggestions(
  supabase: Db,
  restaurantId: string
): Promise<number> {
  try {
    const { count, error } = await supabase
      .from("restaurant_knowledge_suggestions")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", restaurantId)
      .eq("status", "pending");
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}
