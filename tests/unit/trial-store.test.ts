import { describe, expect, it, vi } from "vitest";
import { buildSampleMenu } from "@/lib/trial/sample-menu";
import { toPublicView, upsertStep } from "@/lib/trial/store";
import type { TrialRecord, TrialStepLogEntry } from "@/lib/trial/types";

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(() => null),
}));

function baseTrial(overrides: Partial<TrialRecord> = {}): TrialRecord {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    status: "ready",
    source_kind: "website",
    source_input: "https://joespizza.com/",
    step_log: [],
    restaurant_name: "Joe's Pizza",
    profile: null,
    weekly_hours: null,
    menu: null,
    menu_source: null,
    menu_source_url: null,
    knowledge: [],
    persona: {},
    prompt: "SECRET PROMPT",
    greeting: "Hi there",
    place_id: null,
    transcript: [{ role: "user", text: "private", at: 1 }],
    scorecard: { greeted: true },
    call_count: 2,
    claimed_restaurant_id: null,
    claimed_organization_id: "org-1",
    claimed_at: null,
    error: null,
    created_at: "2026-10-01T00:00:00.000Z",
    updated_at: "2026-10-01T00:00:00.000Z",
    expires_at: "2026-10-08T00:00:00.000Z",
    ...overrides,
  };
}

describe("upsertStep", () => {
  it("appends a new step in pipeline order", () => {
    const log = upsertStep([], { id: "menu", status: "running", title: "Reading menu" });
    const next = upsertStep(log, { id: "listing", status: "done", title: "Found listing", detail: "Google" });
    expect(next.map((s) => s.id)).toEqual(["listing", "menu"]);
    expect(next[0]).toMatchObject({ id: "listing", status: "done", title: "Found listing", detail: "Google" });
    expect(next[1]).toMatchObject({ id: "menu", status: "running", detail: null });
    expect(() => new Date(next[0].at).toISOString()).not.toThrow();
  });

  it("replaces an existing step with the same id and does not mutate the input", () => {
    const original: TrialStepLogEntry[] = [
      { id: "listing", status: "running", title: "Looking", detail: null, at: "2026-10-01T00:00:00.000Z" },
      { id: "agent", status: "pending", title: "Agent", detail: null, at: "2026-10-01T00:00:00.000Z" },
    ];
    const next = upsertStep(original, { id: "listing", status: "failed", title: "Not found", detail: "404" });
    expect(next).toHaveLength(2);
    expect(next.map((s) => s.id)).toEqual(["listing", "agent"]);
    expect(next[0]).toMatchObject({ status: "failed", title: "Not found", detail: "404" });
    expect(original[0].status).toBe("running");
  });
});

describe("toPublicView", () => {
  it("omits secrets and internal fields while resolving the persona", () => {
    const view = toPublicView(baseTrial());
    expect(view).toMatchObject({
      id: "11111111-1111-4111-8111-111111111111",
      status: "ready",
      sourceKind: "website",
      sourceInput: "https://joespizza.com/",
      restaurantName: "Joe's Pizza",
      menuSummary: null,
      greeting: "Hi there",
      scorecard: { greeted: true },
      callCount: 2,
      claimedRestaurantId: null,
      error: null,
      expiresAt: "2026-10-08T00:00:00.000Z",
    });
    // "Joe's Pizza" matches the Italian accent voice, and the host takes that voice's name.
    expect(view.persona).toEqual({
      agentName: "Antonio",
      voiceId: "iLVmqjzCGGvqtMCk6vVQ",
      voiceLabel: "Antonio",
      language: "en",
    });
    const json = JSON.stringify(view);
    expect(json).not.toContain("SECRET PROMPT");
    expect(json).not.toContain("private");
    expect(json).not.toContain("org-1");
    expect(view).not.toHaveProperty("token_hash");
    expect(view).not.toHaveProperty("prompt");
    expect(view).not.toHaveProperty("transcript");
  });

  it("summarizes the menu with counts and up to six sample items", () => {
    const menu = buildSampleMenu(null);
    const view = toPublicView(
      baseTrial({ menu, menu_source: "sample", menu_source_url: null })
    );
    expect(view.menuSummary).toMatchObject({
      source: "sample",
      sourceUrl: null,
      categoryCount: 3,
      itemCount: 7,
    });
    expect(view.menuSummary?.sampleItems).toHaveLength(6);
    expect(view.menuSummary?.sampleItems[0]).toEqual({ name: "House Burger", price: 13, category: "Mains" });
  });

  it("honors a stored persona override", () => {
    const view = toPublicView(
      baseTrial({ persona: { agentName: "Maya", voiceId: "UgBBYS2sOqTuMpoF3BR0", language: "es" } })
    );
    expect(view.persona).toEqual({
      agentName: "Maya",
      voiceId: "UgBBYS2sOqTuMpoF3BR0",
      voiceLabel: "Mark",
      language: "es",
    });
  });
});
