import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildElevenLabsConversationInitPayload,
  isElevenLabsConversationInitAuthorized,
  lookupRestaurantByCalledNumber,
  parseElevenLabsConversationInitRequestBody,
  phoneLookupKey,
  readElevenLabsConversationInitAgentId,
  readElevenLabsConversationInitCalledNumber,
  resolveRestaurantForElevenLabsConversationInit,
} from "@/lib/elevenlabs/conversation-init";
import {
  finalizeConversationInitDynamicVariables,
  valueHasUnresolvedTemplate,
} from "@/lib/elevenlabs-placeholders";

vi.mock("@/lib/supabase/server", () => ({
  getServiceRoleSupabase: vi.fn(),
}));

import { getServiceRoleSupabase } from "@/lib/supabase/server";

describe("readElevenLabsConversationInitAgentId", () => {
  it("prefers query agent_id over body", () => {
    const url = new URL("http://localhost/init?agent_id=from-query");
    expect(
      readElevenLabsConversationInitAgentId(url, { agent_id: "from-body" })
    ).toBe("from-query");
  });

  it("reads agent_id from form-urlencoded-shaped body object", () => {
    expect(
      readElevenLabsConversationInitAgentId(new URL("http://localhost/init"), {
        caller_id: "+1",
        agent_id: "agent_form",
        call_sid: "CA",
      })
    ).toBe("agent_form");
  });

  it("reads agentId camelCase from query or body", () => {
    expect(
      readElevenLabsConversationInitAgentId(
        new URL("http://localhost/init?agentId=camel-query"),
        {}
      )
    ).toBe("camel-query");
    expect(
      readElevenLabsConversationInitAgentId(new URL("http://localhost/init"), {
        agentId: "camel-body",
      })
    ).toBe("camel-body");
  });
});

describe("isElevenLabsConversationInitAuthorized", () => {
  it("allows all traffic when secret unset", () => {
    expect(
      isElevenLabsConversationInitAuthorized({
        configuredSecret: undefined,
        headerSecret: null,
        querySecret: null,
      })
    ).toBe(true);
  });

  it("requires header or query when secret set", () => {
    expect(
      isElevenLabsConversationInitAuthorized({
        configuredSecret: "s",
        headerSecret: "s",
      })
    ).toBe(true);
    expect(
      isElevenLabsConversationInitAuthorized({
        configuredSecret: "s",
        querySecret: "s",
      })
    ).toBe(true);
    expect(
      isElevenLabsConversationInitAuthorized({
        configuredSecret: "s",
        headerSecret: "wrong",
      })
    ).toBe(false);
  });
});

describe("parseElevenLabsConversationInitRequestBody", () => {
  it("parses application/x-www-form-urlencoded POST", async () => {
    const req = new Request("http://localhost/init", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "agent_id=agent_form&call_sid=CA1",
    });
    const body = await parseElevenLabsConversationInitRequestBody(req);
    expect(body).toEqual({ agent_id: "agent_form", call_sid: "CA1" });
  });
});

describe("buildElevenLabsConversationInitPayload", () => {
  it("returns conversation_initiation_client_data with restaurant vars", () => {
    const payload = buildElevenLabsConversationInitPayload({
      restaurantId: "11111111-1111-1111-1111-111111111111",
      restaurantName: "QA Bistro",
    });
    expect(payload.type).toBe("conversation_initiation_client_data");
    expect(payload.dynamic_variables.restaurant_id).toBe(
      "11111111-1111-1111-1111-111111111111"
    );
    expect(payload.dynamic_variables.restaurant_name).toBe("QA Bistro");
  });

  it("merges agent placeholders with resolved restaurant fields", () => {
    const payload = buildElevenLabsConversationInitPayload({
      restaurantId: "11111111-1111-1111-1111-111111111111",
      restaurantName: "QA Bistro",
      agentPlaceholders: {
        restaurant_id: "old-id",
        extra_key: "keep-me",
      },
    });
    expect(payload.dynamic_variables.restaurant_id).toBe(
      "11111111-1111-1111-1111-111111111111"
    );
    expect(payload.dynamic_variables.restaurant_name).toBe("QA Bistro");
    expect(payload.dynamic_variables.extra_key).toBe("keep-me");
  });

  it("falls back restaurant_name when empty", () => {
    const payload = buildElevenLabsConversationInitPayload({
      restaurantId: "11111111-1111-1111-1111-111111111111",
      restaurantName: "",
    });
    expect(payload.dynamic_variables.restaurant_name).toBe("the restaurant");
  });

  it("strips unresolved mustache templates from dynamic_variables", () => {
    const payload = buildElevenLabsConversationInitPayload({
      restaurantId: "11111111-1111-4111-8111-111111111111",
      restaurantName: "QA Bistro",
      agentPlaceholders: {
        restaurant_name: "{{restaurant_name}}",
        restaurant_id: "{{restaurant_id}}",
        custom: "{{other}}",
      },
    });
    expect(payload.dynamic_variables.restaurant_name).toBe("QA Bistro");
    expect(payload.dynamic_variables.restaurant_id).toBe(
      "11111111-1111-4111-8111-111111111111"
    );
    expect(payload.dynamic_variables.custom).toBe("");
    expect(
      Object.values(payload.dynamic_variables).some((v) =>
        valueHasUnresolvedTemplate(v)
      )
    ).toBe(false);
  });
});

describe("readElevenLabsConversationInitCalledNumber", () => {
  it("reads called_number from form body", () => {
    expect(
      readElevenLabsConversationInitCalledNumber(new URL("http://localhost/init"), {
        caller_id: "+15551111111",
        called_number: "+15559876543",
        agent_id: "agent_1",
      })
    ).toBe("+15559876543");
  });

  it("reads To from JSON Twilio body", () => {
    expect(
      readElevenLabsConversationInitCalledNumber(new URL("http://localhost/init"), {
        To: "+15551234567",
        agentId: "agent_1",
      })
    ).toBe("+15551234567");
  });
});

describe("phoneLookupKey", () => {
  it("normalizes E.164 to last 10 digits", () => {
    expect(phoneLookupKey("+1 (555) 987-6543")).toBe("5559876543");
  });

  it("returns null for too-short numbers", () => {
    expect(phoneLookupKey("55512")).toBeNull();
  });
});

describe("finalizeConversationInitDynamicVariables", () => {
  it("removes mustache markers and keeps concrete restaurant_name", () => {
    const out = finalizeConversationInitDynamicVariables({
      restaurant_name: "{{restaurant_name}}",
      restaurant_id: "rid-1",
    });
    expect(out.restaurant_name).toBe("the restaurant");
    expect(out.restaurant_id).toBe("rid-1");
  });
});

describe("resolveRestaurantForElevenLabsConversationInit", () => {
  const RESTAURANT_ID = "9d3263d1-4d9d-4f89-bfc5-160e2cca1855";
  const AGENT_ID = "agent_dedicated_01";
  const PHONE = "+15559876543";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockSupabaseProfiles(
    profiles: {
      restaurant_id: string;
      phone: string | null;
      elevenlabs_agent_id: string | null;
    }[]
  ) {
    const restaurants = new Map<string, { name: string }>([
      [RESTAURANT_ID, { name: "Egg Mania" }],
    ]);

    vi.mocked(getServiceRoleSupabase).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "restaurant_profiles") {
          return {
            select: vi.fn((cols: string) => {
              const fields = cols.split(",").map((c) => c.trim());
              if (fields.includes("phone")) {
                return {
                  not: vi.fn().mockResolvedValue({ data: profiles, error: null }),
                };
              }
              return {
                eq: vi.fn((_field: string, value: string) => ({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data:
                      profiles.find((p) => p.elevenlabs_agent_id === value) ??
                      null,
                    error: null,
                  }),
                })),
              };
            }),
          };
        }
        if (table === "restaurants") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockImplementation(async () => {
                  const row = restaurants.get(RESTAURANT_ID);
                  return { data: row ?? null, error: null };
                }),
              })),
            })),
          };
        }
        throw new Error(table);
      }),
    } as never);
  }

  it("resolves by saved profile agent id first", async () => {
    mockSupabaseProfiles([
      {
        restaurant_id: RESTAURANT_ID,
        phone: PHONE,
        elevenlabs_agent_id: AGENT_ID,
      },
    ]);

    const ctx = await resolveRestaurantForElevenLabsConversationInit({
      agentId: AGENT_ID,
      calledNumber: PHONE,
    });

    expect(ctx).toEqual({
      restaurantId: RESTAURANT_ID,
      restaurantName: "Egg Mania",
      linkedAgentId: AGENT_ID,
      resolvedVia: "agent_id",
    });
  });

  it("falls back to called_number when agent id is unknown", async () => {
    mockSupabaseProfiles([
      {
        restaurant_id: RESTAURANT_ID,
        phone: PHONE,
        elevenlabs_agent_id: AGENT_ID,
      },
    ]);

    const ctx = await resolveRestaurantForElevenLabsConversationInit({
      agentId: "agent_unknown",
      calledNumber: PHONE,
    });

    expect(ctx?.resolvedVia).toBe("called_number");
    expect(ctx?.restaurantId).toBe(RESTAURANT_ID);
    expect(ctx?.linkedAgentId).toBe(AGENT_ID);
  });

  it("resolves by called_number when agent_id omitted", async () => {
    mockSupabaseProfiles([
      {
        restaurant_id: RESTAURANT_ID,
        phone: PHONE,
        elevenlabs_agent_id: AGENT_ID,
      },
    ]);

    const ctx = await resolveRestaurantForElevenLabsConversationInit({
      agentId: "",
      calledNumber: PHONE,
    });

    expect(ctx?.resolvedVia).toBe("called_number");
    expect(ctx?.linkedAgentId).toBe(AGENT_ID);
  });

  it("returns null when phone has no profile match and agent unknown", async () => {
    mockSupabaseProfiles([]);

    const ctx = await resolveRestaurantForElevenLabsConversationInit({
      agentId: "agent_unknown",
      calledNumber: "+15550001111",
    });

    expect(ctx).toBeNull();
  });
});

describe("lookupRestaurantByCalledNumber", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("matches profile phone by last 10 digits", async () => {
    const RESTAURANT_ID = "9d3263d1-4d9d-4f89-bfc5-160e2cca1855";
    vi.mocked(getServiceRoleSupabase).mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "restaurant_profiles") {
          return {
            select: vi.fn(() => ({
              not: vi.fn().mockResolvedValue({
                data: [
                  {
                    restaurant_id: RESTAURANT_ID,
                    phone: "(555) 987-6543",
                    elevenlabs_agent_id: "agent_phone",
                  },
                ],
                error: null,
              }),
            })),
          };
        }
        if (table === "restaurants") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { name: "Phone Bistro" },
                  error: null,
                }),
              })),
            })),
          };
        }
        throw new Error(table);
      }),
    } as never);

    const ctx = await lookupRestaurantByCalledNumber("+15559876543");
    expect(ctx?.restaurantName).toBe("Phone Bistro");
    expect(ctx?.linkedAgentId).toBe("agent_phone");
  });
});
