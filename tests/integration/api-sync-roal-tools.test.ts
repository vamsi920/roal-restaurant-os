import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/integrations/elevenlabs/sync-roal-tools/route";

const AGENT_ID = "agent_sync_qa_test";
const SYNC_TOKEN = "qa-sync-token-secret";

vi.mock("@/lib/env.server", () => ({
  getElevenLabsAgentId: vi.fn(),
  getElevenLabsSyncToken: vi.fn(),
}));

vi.mock("@/lib/sync-elevenlabs-roal-tools", () => ({
  syncRoalElevenLabsTools: vi.fn(),
}));

import { getElevenLabsAgentId, getElevenLabsSyncToken } from "@/lib/env.server";
import { syncRoalElevenLabsTools } from "@/lib/sync-elevenlabs-roal-tools";

function postSync(init?: RequestInit) {
  return POST(
    new Request("http://localhost/api/integrations/elevenlabs/sync-roal-tools", {
      method: "POST",
      ...init,
    })
  );
}

describe("POST /api/integrations/elevenlabs/sync-roal-tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getElevenLabsAgentId).mockImplementation((fallback) => {
      const q = fallback?.trim();
      return q || AGENT_ID;
    });
    vi.mocked(getElevenLabsSyncToken).mockReturnValue(undefined);
    vi.mocked(syncRoalElevenLabsTools).mockResolvedValue({
      ok: true,
      restaurant_tools_baked: true,
      tools: [],
    } as never);
  });

  it("returns 401 when sync token configured and bearer missing", async () => {
    vi.mocked(getElevenLabsSyncToken).mockReturnValue(SYNC_TOKEN);

    const res = await postSync();
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
    expect(syncRoalElevenLabsTools).not.toHaveBeenCalled();
  });

  it("returns 401 when bearer does not match sync token", async () => {
    vi.mocked(getElevenLabsSyncToken).mockReturnValue(SYNC_TOKEN);

    const res = await postSync({
      headers: { Authorization: "Bearer wrong-token" },
    });

    expect(res.status).toBe(401);
    expect(syncRoalElevenLabsTools).not.toHaveBeenCalled();
  });

  it("returns 200 when bearer matches sync token", async () => {
    vi.mocked(getElevenLabsSyncToken).mockReturnValue(SYNC_TOKEN);

    const res = await postSync({
      headers: { Authorization: `Bearer ${SYNC_TOKEN}` },
      body: JSON.stringify({ agent_id: AGENT_ID }),
    });

    expect(res.status).toBe(200);
    expect(syncRoalElevenLabsTools).toHaveBeenCalledWith(
      expect.objectContaining({ agentId: AGENT_ID })
    );
  });

  it("returns 200 when sync token is not configured", async () => {
    const res = await postSync({
      body: JSON.stringify({ agent_id: AGENT_ID }),
    });

    expect(res.status).toBe(200);
    expect(syncRoalElevenLabsTools).toHaveBeenCalled();
  });

  it("returns 400 when agent_id cannot be resolved", async () => {
    vi.mocked(getElevenLabsAgentId).mockReturnValue(null);

    const res = await postSync({
      headers: { Authorization: `Bearer ${SYNC_TOKEN}` },
      body: JSON.stringify({}),
    });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/Missing agent_id/);
    expect(syncRoalElevenLabsTools).not.toHaveBeenCalled();
  });
});
