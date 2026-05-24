import { beforeEach, describe, expect, it, vi } from "vitest";
import { EnvValidationError } from "@/lib/env.shared";
import { GET, PATCH } from "@/app/api/integrations/elevenlabs/agent/route";

const DEFAULT_AGENT = "agent-default-qa";
vi.mock("@/lib/env.server", () => ({
  getElevenLabsAgentId: vi.fn(),
}));

vi.mock("@/lib/elevenlabs", () => ({
  getConvaiAgent: vi.fn(),
  patchConvaiAgent: vi.fn(),
}));

import { getElevenLabsAgentId } from "@/lib/env.server";
import { getConvaiAgent, patchConvaiAgent } from "@/lib/elevenlabs";

const agentSummary = {
  agent_id: DEFAULT_AGENT,
  name: "QA Agent",
  conversation_config: { agent: { first_message: "Hello" } },
};

describe("GET/PATCH /api/integrations/elevenlabs/agent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getElevenLabsAgentId).mockImplementation((fallback) => {
      const q = fallback?.trim();
      return q || DEFAULT_AGENT;
    });
    vi.mocked(getConvaiAgent).mockResolvedValue(agentSummary);
    vi.mocked(patchConvaiAgent).mockResolvedValue(agentSummary);
  });

  it("GET without agent_id uses ELEVENLABS_AGENT_ID default", async () => {
    const res = await GET(new Request("http://localhost/api/integrations/elevenlabs/agent"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(getElevenLabsAgentId).toHaveBeenCalledWith(null);
    expect(body.agent_id).toBe(DEFAULT_AGENT);
    expect(body.agent).toEqual(agentSummary);
  });

  it("GET with ?agent_id= passes query to resolver", async () => {
    const custom = "agent-custom-qa";
    const res = await GET(
      new Request(
        `http://localhost/api/integrations/elevenlabs/agent?agent_id=${encodeURIComponent(custom)}`
      )
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(getElevenLabsAgentId).toHaveBeenCalledWith(custom);
    expect(getConvaiAgent).toHaveBeenCalledWith(custom);
    expect(body.agent_id).toBe(custom);
  });

  it("GET returns 400 when no agent id is configured", async () => {
    vi.mocked(getElevenLabsAgentId).mockReturnValue(null);

    const res = await GET(new Request("http://localhost/api/integrations/elevenlabs/agent"));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/Missing agent_id/);
    expect(getConvaiAgent).not.toHaveBeenCalled();
  });

  it("GET returns 503 with helpful env error and no stack leak", async () => {
    vi.mocked(getConvaiAgent).mockRejectedValue(
      new EnvValidationError([
        {
          path: "ELEVENLABS_API_KEY",
          message: "Required for ElevenLabs Conversational AI API calls",
          hint: "ElevenLabs profile → API key",
        },
      ])
    );

    const res = await GET(new Request("http://localhost/api/integrations/elevenlabs/agent"));
    const text = await res.text();

    expect(res.status).toBe(503);
    expect(text).toContain("ELEVENLABS_API_KEY");
    expect(text).not.toMatch(/at\s+\S+\s+\(/);
    expect(text).not.toContain("Error:");
    const body = JSON.parse(text) as { error: string };
  });

  it("GET response envelope does not add server API key fields", async () => {
    const res = await GET(new Request("http://localhost/api/integrations/elevenlabs/agent"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(Object.keys(body).sort()).toEqual(["agent", "agent_id"]);
    expect(body).not.toHaveProperty("api_key");
    expect(body).not.toHaveProperty("ELEVENLABS_API_KEY");
    expect(JSON.stringify(body)).not.toMatch(/xi-api-key/i);
  });

  it("PATCH smoke forwards JSON body to ElevenLabs", async () => {
    const patchBody = { name: "Patched QA" };
    const res = await PATCH(
      new Request("http://localhost/api/integrations/elevenlabs/agent", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchBody),
      })
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(patchConvaiAgent).toHaveBeenCalledWith(DEFAULT_AGENT, patchBody);
    expect(body.agent_id).toBe(DEFAULT_AGENT);
    expect(body.agent).toEqual(agentSummary);
  });

  it("PATCH returns 400 when body is not JSON object", async () => {
    const res = await PATCH(
      new Request("http://localhost/api/integrations/elevenlabs/agent", {
        method: "PATCH",
        body: "not-json",
      })
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("JSON body required");
    expect(patchConvaiAgent).not.toHaveBeenCalled();
  });
});
