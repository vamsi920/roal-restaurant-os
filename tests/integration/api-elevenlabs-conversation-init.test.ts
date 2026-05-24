import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/integrations/elevenlabs/conversation-init/route";
import { DEFAULT_RESTAURANT_NAME } from "@/lib/elevenlabs-placeholders";

const AGENT = "agent_qa_conversation_init";
const RESTAURANT_ID = "9d3263d1-4d9d-4f89-bfc5-160e2cca1855";
const INIT_SECRET = "qa-conversation-init-secret";

vi.mock("@/lib/env.server", () => ({
  getElevenLabsConversationInitSecret: vi.fn(),
}));

vi.mock("@/lib/elevenlabs/conversation-init", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/elevenlabs/conversation-init")>();
  return {
    ...actual,
    lookupRestaurantForElevenLabsAgent: vi.fn(),
  };
});

import { getElevenLabsConversationInitSecret } from "@/lib/env.server";
import { lookupRestaurantForElevenLabsAgent } from "@/lib/elevenlabs/conversation-init";

const base = "http://localhost/api/integrations/elevenlabs/conversation-init";

describe("GET/POST /api/integrations/elevenlabs/conversation-init", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getElevenLabsConversationInitSecret).mockReturnValue(undefined);
    vi.mocked(lookupRestaurantForElevenLabsAgent).mockResolvedValue({
      restaurantId: RESTAURANT_ID,
      restaurantName: "QA Bistro",
    });
  });

  it("GET ?agent_id= returns conversation_initiation_client_data", async () => {
    const res = await GET(
      new Request(`${base}?agent_id=${encodeURIComponent(AGENT)}`)
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(lookupRestaurantForElevenLabsAgent).toHaveBeenCalledWith(AGENT);
    expect(body.type).toBe("conversation_initiation_client_data");
    expect(body.dynamic_variables.restaurant_id).toBe(RESTAURANT_ID);
    expect(body.dynamic_variables.restaurant_name).toBe("QA Bistro");
    expect(JSON.stringify(body)).not.toMatch(/qa-conversation-init-secret/);
  });

  it("POST Twilio-shaped body resolves agent_id and ignores call metadata", async () => {
    const res = await POST(
      new Request(base, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caller_id: "+15551234567",
          agent_id: AGENT,
          called_number: "+15559876543",
          call_sid: "CAxxxxxxxx",
        }),
      })
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(lookupRestaurantForElevenLabsAgent).toHaveBeenCalledWith(AGENT);
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
    expect(lookupRestaurantForElevenLabsAgent).toHaveBeenCalledWith(AGENT);
  });

  it("returns 400 when agent_id is missing", async () => {
    const res = await GET(new Request(base));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/Missing agent_id/);
    expect(lookupRestaurantForElevenLabsAgent).not.toHaveBeenCalled();
  });

  it("returns default restaurant_name when lookup misses", async () => {
    vi.mocked(lookupRestaurantForElevenLabsAgent).mockResolvedValue(null);

    const res = await GET(
      new Request(`${base}?agent_id=${encodeURIComponent("agent_unknown")}`)
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.dynamic_variables.restaurant_id).toBe("");
    expect(body.dynamic_variables.restaurant_name).toBe(DEFAULT_RESTAURANT_NAME);
  });

  it("returns 401 when secret configured and missing", async () => {
    vi.mocked(getElevenLabsConversationInitSecret).mockReturnValue(INIT_SECRET);

    const res = await GET(
      new Request(`${base}?agent_id=${encodeURIComponent(AGENT)}`)
    );

    expect(res.status).toBe(401);
    expect(lookupRestaurantForElevenLabsAgent).not.toHaveBeenCalled();
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
    expect(lookupRestaurantForElevenLabsAgent).toHaveBeenCalledWith(AGENT);
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
