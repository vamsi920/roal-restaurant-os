import { describe, expect, it, vi } from "vitest";
import { EnvValidationError } from "@/lib/env.shared";
import {
  buildCreateConvaiAgentBodyFromTemplate,
  buildRestaurantConvaiAgentName,
  provisionRestaurantConvaiAgent,
  readConvaiAgentId,
  resolveTemplateAgentId,
  type ElevenLabsAgentProvisionDeps,
} from "@/lib/elevenlabs/agent-provision";

const TEMPLATE_ID = "agent_template_01";
const RESTAURANT_ID = "00000000-0000-4000-8000-000000000099";

function mockDeps(
  overrides: Partial<ElevenLabsAgentProvisionDeps> = {}
): ElevenLabsAgentProvisionDeps {
  return {
    getTemplateAgentId: () => TEMPLATE_ID,
    getConvaiAgent: vi.fn().mockResolvedValue({
      agent_id: TEMPLATE_ID,
      name: "ROAL Template",
      conversation_config: {
        agent: { language: "en", prompt: { prompt: "template" } },
      },
    }),
    duplicateConvaiAgent: vi
      .fn()
      .mockResolvedValue({ agent_id: "agent_clone_01" }),
    createConvaiAgent: vi
      .fn()
      .mockResolvedValue({ agent_id: "agent_created_01" }),
    ...overrides,
  };
}

describe("readConvaiAgentId", () => {
  it("reads agent_id from create/duplicate responses", () => {
    expect(readConvaiAgentId({ agent_id: "agent_abc" })).toBe("agent_abc");
  });

  it("throws when agent_id missing", () => {
    expect(() => readConvaiAgentId({})).toThrow(/missing agent_id/);
  });
});

describe("buildRestaurantConvaiAgentName", () => {
  it("includes restaurant label and id prefix", () => {
    expect(
      buildRestaurantConvaiAgentName("Joe's Diner", RESTAURANT_ID)
    ).toContain("Joe's Diner");
    expect(
      buildRestaurantConvaiAgentName("Joe's Diner", RESTAURANT_ID)
    ).toContain("00000000");
  });
});

describe("buildCreateConvaiAgentBodyFromTemplate", () => {
  it("copies only name and conversation_config", () => {
    const body = buildCreateConvaiAgentBodyFromTemplate(
      {
        agent_id: TEMPLATE_ID,
        name: "Template",
        conversation_config: { agent: { language: "en" } },
        metadata: { foo: 1 },
      },
      "ROAL — Test"
    );
    expect(body).toEqual({
      name: "ROAL — Test",
      conversation_config: { agent: { language: "en" } },
    });
  });
});

describe("resolveTemplateAgentId", () => {
  it("prefers explicit templateAgentId", () => {
    expect(
      resolveTemplateAgentId(
        { templateAgentId: "agent_override" },
        { getTemplateAgentId: () => TEMPLATE_ID }
      )
    ).toBe("agent_override");
  });

  it("throws EnvValidationError when no template", () => {
    expect(() =>
      resolveTemplateAgentId(
        {},
        { getTemplateAgentId: () => null }
      )
    ).toThrow(EnvValidationError);
  });
});

describe("provisionRestaurantConvaiAgent", () => {
  it("rejects when ElevenLabs returns the template agent id", async () => {
    const deps = mockDeps({
      duplicateConvaiAgent: vi.fn().mockResolvedValue({ agent_id: TEMPLATE_ID }),
    });

    await expect(
      provisionRestaurantConvaiAgent(
        {
          restaurantId: RESTAURANT_ID,
          restaurantName: "Must Not Share Template",
          fallbackToCreateOnDuplicateError: false,
        },
        deps
      )
    ).rejects.toThrow(/shared template agent/i);

    expect(deps.createConvaiAgent).not.toHaveBeenCalled();
  });

  it("duplicates template with display name by default", async () => {
    const deps = mockDeps();
    const result = await provisionRestaurantConvaiAgent(
      {
        restaurantId: RESTAURANT_ID,
        restaurantName: "North Location",
      },
      deps
    );

    expect(result.method).toBe("duplicate");
    expect(result.agent_id).toBe("agent_clone_01");
    expect(result.template_agent_id).toBe(TEMPLATE_ID);
    expect(deps.duplicateConvaiAgent).toHaveBeenCalledWith(TEMPLATE_ID, {
      name: buildRestaurantConvaiAgentName("North Location", RESTAURANT_ID),
    });
    expect(deps.createConvaiAgent).not.toHaveBeenCalled();
  });

  it("creates from template when method is create", async () => {
    const deps = mockDeps();
    const result = await provisionRestaurantConvaiAgent(
      {
        restaurantId: RESTAURANT_ID,
        restaurantName: "South",
        method: "create",
      },
      deps
    );

    expect(result.method).toBe("create");
    expect(result.agent_id).toBe("agent_created_01");
    expect(deps.getConvaiAgent).toHaveBeenCalledWith(TEMPLATE_ID);
    expect(deps.createConvaiAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: buildRestaurantConvaiAgentName("South", RESTAURANT_ID),
        conversation_config: expect.objectContaining({
          agent: expect.any(Object),
        }),
      })
    );
    expect(deps.duplicateConvaiAgent).not.toHaveBeenCalled();
  });

  it("falls back to create when duplicate fails", async () => {
    const deps = mockDeps({
      duplicateConvaiAgent: vi
        .fn()
        .mockRejectedValue(new Error("duplicate unavailable")),
    });

    const result = await provisionRestaurantConvaiAgent(
      {
        restaurantId: RESTAURANT_ID,
        restaurantName: "Fallback",
      },
      deps
    );

    expect(result.method).toBe("create");
    expect(result.agent_id).toBe("agent_created_01");
    expect(deps.createConvaiAgent).toHaveBeenCalled();
  });

  it("rethrows duplicate error when fallback disabled", async () => {
    const deps = mockDeps({
      duplicateConvaiAgent: vi.fn().mockRejectedValue(new Error("nope")),
    });

    await expect(
      provisionRestaurantConvaiAgent(
        {
          restaurantId: RESTAURANT_ID,
          restaurantName: "Strict",
          fallbackToCreateOnDuplicateError: false,
        },
        deps
      )
    ).rejects.toThrow("nope");
  });
});
