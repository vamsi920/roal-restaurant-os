import type { Db } from "@/lib/db";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ai", () => ({
  extractCallInsightsFromTranscript: vi.fn(),
}));

import { extractCallInsightsFromTranscript } from "@/lib/ai";
import {
  loadKnowledgeSuggestions,
  mineKnowledgeSuggestionsFromTranscript,
  questionSimilarity,
  transcriptTurnsFromRows,
} from "@/lib/knowledge-suggestions/helpers";

describe("questionSimilarity", () => {
  it("is 1 for identical questions regardless of case and punctuation", () => {
    expect(questionSimilarity("Do you have parking?", "do you have PARKING")).toBe(1);
  });

  it("is 0 when there is no overlap or no usable tokens", () => {
    expect(questionSimilarity("Is there parking?", "Open Sunday?")).toBe(0);
    expect(questionSimilarity("a b", "parking")).toBe(0);
    expect(questionSimilarity("", "parking")).toBe(0);
  });

  it("scales with shared tokens over the larger token set", () => {
    // tokens (len > 2): {you, have, parking} vs {you, have, parking, lot, behind}
    expect(questionSimilarity("Do you have parking?", "Do you have a parking lot behind?")).toBeCloseTo(0.6);
    // short filler words (<= 2 chars) never count
    expect(questionSimilarity("is it ok", "is it ok to park")).toBe(0);
  });
});

describe("transcriptTurnsFromRows", () => {
  it("accepts ElevenLabs rows ({role, message}) and our own ({role, text})", () => {
    expect(
      transcriptTurnsFromRows([
        { role: "agent", message: " Hi there " },
        { role: "user", text: "Is there parking?" },
        { role: "assistant", message: "Yes" },
      ])
    ).toEqual([
      { role: "agent", text: "Hi there" },
      { role: "user", text: "Is there parking?" },
      { role: "agent", text: "Yes" },
    ]);
  });

  it("drops rows without a role or text and non-arrays", () => {
    expect(transcriptTurnsFromRows(null)).toEqual([]);
    expect(transcriptTurnsFromRows("nope")).toEqual([]);
    expect(
      transcriptTurnsFromRows([null, 3, { role: "user" }, { message: "x" }, { role: "user", message: "   " }])
    ).toEqual([]);
  });
});

type PendingRow = {
  id: string;
  organization_id: string;
  restaurant_id: string;
  session_id: string | null;
  caller_question: string;
  suggested_question: string;
  suggested_answer: string | null;
  category: string;
  status: string;
  times_asked: number;
  created_at: string;
  updated_at: string;
};

function pendingRow(overrides: Partial<PendingRow>): PendingRow {
  return {
    id: "s1",
    organization_id: "org-1",
    restaurant_id: "r1",
    session_id: null,
    caller_question: "any parking?",
    suggested_question: "Do you have parking?",
    suggested_answer: null,
    category: "directions",
    status: "pending",
    times_asked: 2,
    created_at: "2026-10-01T00:00:00.000Z",
    updated_at: "2026-10-01T00:00:00.000Z",
    ...overrides,
  };
}

/** Minimal supabase double: select chain resolves to `rows`; insert/update are spied. */
function fakeSupabase(rows: PendingRow[], options: { insertError?: { message: string } | null } = {}) {
  const selectFilters: Array<[string, unknown]> = [];
  const selectChain: Record<string, unknown> = {};
  const chainable = () => selectChain;
  Object.assign(selectChain, {
    eq: vi.fn((col: string, val: unknown) => {
      selectFilters.push([col, val]);
      return selectChain;
    }),
    order: vi.fn(chainable),
    limit: vi.fn(chainable),
    then: (resolve: (v: unknown) => void) => resolve({ data: rows, error: null }),
  });

  const updateEq = vi.fn(async () => ({ data: null, error: null }));
  const update = vi.fn(() => ({ eq: updateEq }));
  const insert = vi.fn(async () => ({ data: null, error: options.insertError ?? null }));
  const select = vi.fn(() => selectChain);
  const from = vi.fn((table: string) => {
    expect(table).toBe("restaurant_knowledge_suggestions");
    return { select, update, insert };
  });
  return { client: { from } as unknown as Db, from, select, update, updateEq, insert, selectFilters };
}

const baseInput = {
  restaurantId: "r1",
  organizationId: "org-1",
  sessionId: "sess-1",
};

describe("loadKnowledgeSuggestions", () => {
  it("filters by restaurant and optional status and maps rows", async () => {
    const db = fakeSupabase([pendingRow({ category: "bogus", times_asked: 3 })]);
    const rows = await loadKnowledgeSuggestions(db.client, "r1", { status: "pending", limit: 5 });
    expect(db.selectFilters).toEqual([
      ["restaurant_id", "r1"],
      ["status", "pending"],
    ]);
    expect(rows[0]).toMatchObject({ id: "s1", category: "general", times_asked: 3, status: "pending" });
  });
});

describe("mineKnowledgeSuggestionsFromTranscript", () => {
  beforeEach(() => {
    vi.mocked(extractCallInsightsFromTranscript).mockReset();
  });

  it("does nothing without user turns and never calls the model", async () => {
    const db = fakeSupabase([]);
    const result = await mineKnowledgeSuggestionsFromTranscript(db.client, {
      ...baseInput,
      turns: [{ role: "agent", text: "Hello" }],
    });
    expect(result).toEqual({ created: 0, merged: 0 });
    expect(extractCallInsightsFromTranscript).not.toHaveBeenCalled();
    expect(db.from).not.toHaveBeenCalled();
  });

  it("merges a similar pending suggestion and inserts a new one", async () => {
    vi.mocked(extractCallInsightsFromTranscript).mockResolvedValue({
      data: {
        unanswered_questions: [
          {
            caller_question: "is there parking nearby",
            suggested_question: "Do you have parking?",
            suggested_answer: "Street parking only.",
            category: "directions",
          },
          {
            caller_question: "can I bring my dog",
            suggested_question: "Are dogs allowed on the patio?",
            suggested_answer: "Yes, leashed dogs are welcome.",
            category: "not-a-category",
          },
          { caller_question: "", suggested_question: "Ignored because empty" },
        ],
      },
    } as never);
    const db = fakeSupabase([pendingRow({ times_asked: 2 })]);

    const result = await mineKnowledgeSuggestionsFromTranscript(db.client, {
      ...baseInput,
      turns: [
        { role: "agent", text: "Hi" },
        { role: "user", text: "is there parking nearby" },
        { role: "user", text: "can I bring my dog" },
      ],
    });

    expect(result).toEqual({ created: 1, merged: 1 });
    expect(extractCallInsightsFromTranscript).toHaveBeenCalledTimes(1);

    expect(db.update).toHaveBeenCalledTimes(1);
    expect(db.update.mock.calls[0][0]).toMatchObject({ times_asked: 3 });
    expect(db.updateEq).toHaveBeenCalledWith("id", "s1");

    expect(db.insert).toHaveBeenCalledTimes(1);
    expect(db.insert.mock.calls[0][0]).toEqual({
      organization_id: "org-1",
      restaurant_id: "r1",
      session_id: "sess-1",
      caller_question: "can I bring my dog",
      suggested_question: "Are dogs allowed on the patio?",
      suggested_answer: "Yes, leashed dogs are welcome.",
      category: "general",
    });
  });

  it("merges repeats within the same call against the row it just bumped", async () => {
    vi.mocked(extractCallInsightsFromTranscript).mockResolvedValue({
      data: {
        unanswered_questions: [
          { caller_question: "parking?", suggested_question: "Do you have parking?" },
          { caller_question: "where do I park", suggested_question: "Do you have parking available?" },
        ],
      },
    } as never);
    const db = fakeSupabase([pendingRow({ times_asked: 1 })]);
    const result = await mineKnowledgeSuggestionsFromTranscript(db.client, {
      ...baseInput,
      turns: [{ role: "user", text: "parking?" }],
    });
    expect(result).toEqual({ created: 0, merged: 2 });
    expect(db.update.mock.calls.map((c) => (c[0] as { times_asked: number }).times_asked)).toEqual([2, 3]);
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("does not count an insert that failed", async () => {
    vi.mocked(extractCallInsightsFromTranscript).mockResolvedValue({
      data: { unanswered_questions: [{ caller_question: "q", suggested_question: "Brand new question?" }] },
    } as never);
    const db = fakeSupabase([], { insertError: { message: "duplicate" } });
    const result = await mineKnowledgeSuggestionsFromTranscript(db.client, {
      ...baseInput,
      turns: [{ role: "user", text: "q" }],
    });
    expect(result).toEqual({ created: 0, merged: 0 });
    expect(db.insert).toHaveBeenCalledTimes(1);
  });

  it("skips the database when the model finds nothing", async () => {
    vi.mocked(extractCallInsightsFromTranscript).mockResolvedValue({
      data: { unanswered_questions: [] },
    } as never);
    const db = fakeSupabase([]);
    const result = await mineKnowledgeSuggestionsFromTranscript(db.client, {
      ...baseInput,
      turns: [{ role: "user", text: "hi" }],
    });
    expect(result).toEqual({ created: 0, merged: 0 });
    expect(db.from).not.toHaveBeenCalled();
  });
});
