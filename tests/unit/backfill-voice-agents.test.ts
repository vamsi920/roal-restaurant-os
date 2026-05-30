import { describe, expect, it, vi } from "vitest";
import {
  loadVoiceAgentBackfillCandidates,
  parseBackfillVoiceAgentArgv,
  runVoiceAgentBackfill,
} from "@/lib/voice-agent/backfill-voice-agents";

describe("parseBackfillVoiceAgentArgv", () => {
  it("parses dry-run, force, and limit", () => {
    expect(
      parseBackfillVoiceAgentArgv(["--dry-run", "--force", "--limit", "3"])
    ).toEqual({ dryRun: true, force: true, limit: 3 });
  });

  it("defaults when no flags", () => {
    expect(parseBackfillVoiceAgentArgv([])).toEqual({
      dryRun: false,
      force: false,
      limit: null,
    });
  });

  it("rejects invalid limit", () => {
    expect(() => parseBackfillVoiceAgentArgv(["--limit", "0"])).toThrow(
      /positive integer/
    );
  });
});

describe("loadVoiceAgentBackfillCandidates", () => {
  it("excludes rows with agent id unless force", async () => {
    const supabase = {
      from: vi.fn((table: string) => {
        if (table !== "restaurant_profiles") throw new Error(table);
        return {
          select: vi.fn(() => ({
            order: vi.fn(() => ({
              or: vi.fn(() =>
                Promise.resolve({
                  data: [
                    {
                      restaurant_id: "a",
                      organization_id: "o1",
                      elevenlabs_agent_id: null,
                    },
                    {
                      restaurant_id: "b",
                      organization_id: "o1",
                      elevenlabs_agent_id: "agent_existing",
                    },
                    {
                      restaurant_id: "c",
                      organization_id: "o1",
                      elevenlabs_agent_id: "  ",
                    },
                  ],
                  error: null,
                })
              ),
            })),
          })),
        };
      }),
    };

    const withRestaurants = {
      ...supabase,
      from: vi.fn((table: string) => {
        if (table === "restaurant_profiles") {
          return supabase.from("restaurant_profiles");
        }
        if (table === "restaurants") {
          return {
            select: vi.fn(() => ({
              in: vi.fn(() =>
                Promise.resolve({
                  data: [
                    { id: "a", name: "Alpha" },
                    { id: "c", name: "Charlie" },
                  ],
                  error: null,
                })
              ),
            })),
          };
        }
        throw new Error(table);
      }),
    };

    const candidates = await loadVoiceAgentBackfillCandidates(
      withRestaurants as never,
      { force: false, limit: null }
    );

    expect(candidates.map((c) => c.restaurantId).sort()).toEqual(["a", "c"]);
  });

  it("includes rows with agent id when force", async () => {
    const chain = {
      select: vi.fn(() => ({
        order: vi.fn(() =>
          Promise.resolve({
            data: [
              {
                restaurant_id: "b",
                organization_id: "o1",
                elevenlabs_agent_id: "agent_existing",
              },
            ],
            error: null,
          })
        ),
      })),
    };

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "restaurant_profiles") return chain;
        if (table === "restaurants") {
          return {
            select: vi.fn(() => ({
              in: vi.fn(() =>
                Promise.resolve({
                  data: [{ id: "b", name: "Beta" }],
                  error: null,
                })
              ),
            })),
          };
        }
        throw new Error(table);
      }),
    };

    const candidates = await loadVoiceAgentBackfillCandidates(
      supabase as never,
      { force: true, limit: null }
    );

    expect(candidates).toHaveLength(1);
    expect(candidates[0]?.existingAgentId).toBe("agent_existing");
  });
});

describe("runVoiceAgentBackfill", () => {
  it("dry-run does not call provision", async () => {
    const provision = vi.fn();
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => ({
            or: vi.fn(() =>
              Promise.resolve({
                data: [
                  {
                    restaurant_id: "a",
                    organization_id: "o1",
                    elevenlabs_agent_id: null,
                  },
                ],
                error: null,
              })
            ),
          })),
        })),
      })),
    };

    const fullSupabase = {
      from: vi.fn((table: string) => {
        if (table === "restaurant_profiles") return supabase.from();
        return {
          select: vi.fn(() => ({
            in: vi.fn(() =>
              Promise.resolve({
                data: [{ id: "a", name: "Alpha" }],
                error: null,
              })
            ),
          })),
        };
      }),
    };

    const { results } = await runVoiceAgentBackfill({
      dryRun: true,
      force: false,
      limit: null,
      supabase: fullSupabase as never,
      provision,
    });

    expect(provision).not.toHaveBeenCalled();
    expect(results[0]?.dryRun).toBe(true);
    expect(results[0]?.ok).toBe(true);
  });
});
