import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  assembleControlCenterSnapshot,
  buildEnvSecretRows,
  buildVoiceAgentToolUrls,
} from "@/lib/voice-agent/control-center";
import { sanitizeVoiceAgentDisplayError } from "@/lib/voice-agent/sanitize-display-error";

vi.mock("@/lib/env.public", () => ({
  getPublicEnv: () => ({
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
  }),
}));

vi.mock("@/lib/env.server", () => ({
  collectMissingForFeature: () => [],
}));

describe("voice agent control center", () => {
  it("builds tool URLs without auth secrets", () => {
    const urls = buildVoiceAgentToolUrls({
      edgeBase: "https://example.supabase.co",
      restaurantId: "11111111-1111-4111-8111-111111111111",
      restaurantName: "Test Bistro",
    });
    expect(urls).toHaveLength(3);
    const getMenu = urls.find((u) => u.name === "get_menu_items");
    expect(getMenu?.url).toContain("restaurant_id=");
    for (const row of urls) {
      expect(row.url).not.toMatch(/secret|roal1\.|Bearer/i);
    }
  });

  it("sanitizes secret-like substrings in display errors", () => {
    const out = sanitizeVoiceAgentDisplayError(
      "Auth failed Bearer sk-live-abcdef1234567890 and roal1.abc.def"
    );
    expect(out).not.toContain("sk-live");
    expect(out).not.toContain("roal1.");
    expect(out).toContain("[redacted]");
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redacts secrets from snapshot error fields", () => {
    const snap = assembleControlCenterSnapshot({
      restaurantId: "11111111-1111-4111-8111-111111111111",
      restaurantName: "Test",
      edgeBase: "https://example.supabase.co",
      supabaseRef: "example",
      profileAgentId: null,
      envDefaultAgentId: null,
      lastSyncAt: null,
      lastSyncError: "Invalid key sk-abcdefghijklmnop",
      lastSyncSummary: null,
      menuAutoSync: {
        agentLinked: false,
        status: null,
        error: null,
        lastSyncedAt: null,
      },
      agentRoot: null,
      agentFetchError: null,
    });
    expect(snap.lastSyncError).toContain("[redacted]");
    expect(snap.lastSyncError).not.toContain("sk-abcdefghijklmnop");
  });

  it("env secret rows share agent tool auth status", () => {
    const rows = buildEnvSecretRows();
    const signing = rows.find((r) => r.key === "AGENT_TOOL_SIGNING_SECRET");
    const legacy = rows.find((r) => r.key === "AGENT_TOOL_SECRET");
    expect(signing).toBeDefined();
    expect(legacy).toBeDefined();
    expect(signing!.ok).toBe(legacy!.ok);
  });
});
