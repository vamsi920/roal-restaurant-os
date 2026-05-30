import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/integrations/elevenlabs/conversation-init/route";

const AGENT = "agent_qa_conversation_init";
const RESTAURANT_ID = "9d3263d1-4d9d-4f89-bfc5-160e2cca1855";
const INIT_SECRET = "qa-conversation-init-secret";
const CALLED = "+15559876543";

vi.mock("@/lib/env.server", () => ({
  getElevenLabsConversationInitSecret: vi.fn(),
}));

vi.mock("@/lib/elevenlabs/conversation-init", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/elevenlabs/conversation-init")>();
  return {
    ...actual,
    resolveRestaurantForElevenLabsConversationInit: vi.fn(),
    readAgentPlaceholdersForInit: vi.fn(),
  };
});

import { getElevenLabsConversationInitSecret } from "@/lib/env.server";
import {
  resolveRestaurantForElevenLabsConversationInit,
  readAgentPlaceholdersForInit,
} from "@/lib/elevenlabs/conversation-init";
import { valueHasUnresolvedTemplate } from "@/lib/elevenlabs-placeholders";

const base = "http://localhost/api/integrations/elevenlabs/conversation-init";

function resolvedByAgent() {
  return {
    restaurantId: RESTAURANT_ID,
    restaurantName: "QA Bistro",
    linkedAgentId: AGENT,
    resolvedVia: "agent_id" as const,
  };
}

describe("GET/POST /api/integrations/elevenlabs/conversation-init", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getElevenLabsConversationInitSecret).mockReturnValue(undefined);
    vi.mocked(resolveRestaurantForElevenLabsConversationInit).mockResolvedValue(
      resolvedByAgent()
    );
    vi.mocked(readAgentPlaceholdersForInit).mockResolvedValue({
      restaurant_id: "stale-placeholder",
      restaurant_name: "{{restaurant_name}}",
    });
  });

  it("GET ?agent_id= returns conversation_initiation_client_data without templates", async () => {
    const res = await GET(
      new Request(`${base}?agent_id=${encodeURIComponent(AGENT)}`)
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(resolveRestaurantForElevenLabsConversationInit).toHaveBeenCalledWith({
      agentId: AGENT,
      calledNumber: "",
    });
    expect(readAgentPlaceholdersForInit).toHaveBeenCalledWith(AGENT);
    expect(body.type).toBe("conversation_initiation_client_data");
    expect(body.dynamic_variables.restaurant_id).toBe(RESTAURANT_ID);
    expect(body.dynamic_variables.restaurant_name).toBe("QA Bistro");
    expect(
      Object.values(body.dynamic_variables as Record<string, string>).some((v) =>
        valueHasUnresolvedTemplate(String(v))
      )
    ).toBe(false);
    expect(JSON.stringify(body)).not.toMatch(/qa-conversation-init-secret/);
  });

  it("POST form-urlencoded Twilio body resolves agent_id and called_number", async () => {
    const res = await POST(
      new Request(base, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          caller_id: "+15551234567",
          agent_id: AGENT,
          called_number: CALLED,
          call_sid: "CAxxxxxxxx",
        }).toString(),
      })
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(resolveRestaurantForElevenLabsConversationInit).toHaveBeenCalledWith({
      agentId: AGENT,
      calledNumber: CALLED,
    });
    expect(body.dynamic_variables.restaurant_name).toBe("QA Bistro");
  });

  it("POST JSON Twilio body resolves agent_id and called_number", async () => {
    const res = await POST(
      new Request(base, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caller_id: "+15551234567",
          agent_id: AGENT,
          called_number: CALLED,
          call_sid: "CAxxxxxxxx",
        }),
      })
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(resolveRestaurantForElevenLabsConversationInit).toHaveBeenCalledWith({
      agentId: AGENT,
      calledNumber: CALLED,
    });
    expect(body.dynamic_variables.restaurant_name).toBe("QA Bistro");
  });

  it("POST ?agentId= camelCase query is accepted", async () => {
    const res = await POST(
      new Request(`${base}?agentId=${encodeURIComponent(AGENT)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ call_sid: "CAyyyy" }),
      })
    );

    expect(res.status).toBe(200);
    expect(resolveRestaurantForElevenLabsConversationInit).toHaveBeenCalledWith({
      agentId: AGENT,
      calledNumber: "",
    });
  });

  it("POST called_number only resolves via phone when profile has linked agent", async () => {
    vi.mocked(resolveRestaurantForElevenLabsConversationInit).mockResolvedValue({
      restaurantId: RESTAURANT_ID,
      restaurantName: "Phone Bistro",
      linkedAgentId: AGENT,
      resolvedVia: "called_number",
    });

    const res = await POST(
      new Request(base, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ called_number: CALLED, call_sid: "CAzz" }),
      })
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(resolveRestaurantForElevenLabsConversationInit).toHaveBeenCalledWith({
      agentId: "",
      calledNumber: CALLED,
    });
    expect(readAgentPlaceholdersForInit).toHaveBeenCalledWith(AGENT);
    expect(body.dynamic_variables.restaurant_name).toBe("Phone Bistro");
  });

  it("returns 400 when agent_id and called_number are missing", async () => {
    const res = await GET(new Request(base));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/Missing agent_id or called_number/);
    expect(resolveRestaurantForElevenLabsConversationInit).not.toHaveBeenCalled();
  });

  it("returns 404 when called_number does not map to a provisioned location", async () => {
    vi.mocked(resolveRestaurantForElevenLabsConversationInit).mockResolvedValue(null);

    const res = await POST(
      new Request(base, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ called_number: CALLED }),
      })
    );
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.code).toBe("restaurant_not_linked");
    expect(readAgentPlaceholdersForInit).not.toHaveBeenCalled();
  });

  it("returns 404 when agent_id is not linked to a restaurant profile", async () => {
    vi.mocked(resolveRestaurantForElevenLabsConversationInit).mockResolvedValue(null);

    const res = await GET(
      new Request(`${base}?agent_id=${encodeURIComponent("agent_unknown")}`)
    );
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.code).toBe("restaurant_not_linked");
    expect(readAgentPlaceholdersForInit).not.toHaveBeenCalled();
  });

  it("returns 401 when secret configured and missing", async () => {
    vi.mocked(getElevenLabsConversationInitSecret).mockReturnValue(INIT_SECRET);

    const res = await GET(
      new Request(`${base}?agent_id=${encodeURIComponent(AGENT)}`)
    );

    expect(res.status).toBe(401);
    expect(resolveRestaurantForElevenLabsConversationInit).not.toHaveBeenCalled();
  });

  it("accepts x-roal-conversation-init-secret header", async () => {
    vi.mocked(getElevenLabsConversationInitSecret).mockReturnValue(INIT_SECRET);

    const res = await POST(
      new Request(base, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-roal-conversation-init-secret": INIT_SECRET,
        },
        body: JSON.stringify({ agent_id: AGENT }),
      })
    );

    expect(res.status).toBe(200);
    expect(resolveRestaurantForElevenLabsConversationInit).toHaveBeenCalled();
  });

  it("accepts ?secret= query param", async () => {
    vi.mocked(getElevenLabsConversationInitSecret).mockReturnValue(INIT_SECRET);

    const res = await GET(
      new Request(
        `${base}?agent_id=${encodeURIComponent(AGENT)}&secret=${encodeURIComponent(INIT_SECRET)}`
      )
    );

    expect(res.status).toBe(200);
  });
});
