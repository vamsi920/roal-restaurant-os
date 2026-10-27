import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  assembleControlCenterSnapshot,
  buildEnvSecretRows,
  buildVoiceAgentToolUrls,
} from "@/lib/voice-agent/control-center";
import { sanitizeVoiceAgentDisplayError } from "@/lib/voice-agent/sanitize-display-error";

vi.mock("@/lib/env.public", () => ({
  getPublicEnv: () => ({
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: "roal-test",
  }),
}));

vi.mock("@/lib/env.server", () => ({
  collectMissingForFeature: () => [],
}));

describe("voice agent control center", () => {
  it("builds tool URLs without auth secrets", () => {
    const urls = buildVoiceAgentToolUrls({
      baseUrl: "https://app.roal.test",
      restaurantId: "11111111-1111-4111-8111-111111111111",
      restaurantName: "Test Bistro",
    });
    expect(urls).toHaveLength(7);
    const getMenu = urls.find((u) => u.name === "get_menu_items");
    expect(getMenu?.url).toContain("restaurant_id=");
    const info = urls.find((u) => u.name === "get_restaurant_info");
    expect(info?.url).toContain("https://app.roal.test/api/agent-tools/get-restaurant-info");
    const status = urls.find((u) => u.name === "get_order_status");
    expect(status?.url).toContain("https://app.roal.test/api/agent-tools/get-order-status");
    const history = urls.find((u) => u.name === "get_caller_history");
    expect(history?.url).toContain("https://app.roal.test/api/agent-tools/get-caller-history");
    const reservation = urls.find(
      (u) => u.name === "submit_reservation_request"
    );
    expect(reservation?.url).toContain(
      "https://app.roal.test/api/agent-tools/submit-reservation-request"
    );
    for (const row of urls) {
      expect(row.url).not.toMatch(/secret|roal1\.|Bearer/i);
      expect(row.url).not.toContain("/functions/v1/");
      expect(row.headerNote).not.toMatch(/apikey|anon/i);
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
      agentToolsBase: "https://app.roal.test",
      supabaseRef: null,
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

  it("flags non-public agent tool bases in the checklist", () => {
    const base = {
      restaurantId: "11111111-1111-4111-8111-111111111111",
      restaurantName: "Test",
      profileAgentId: null,
      envDefaultAgentId: null,
      lastSyncAt: null,
      lastSyncError: null,
      lastSyncSummary: null,
      menuAutoSync: { agentLinked: false, status: null, error: null, lastSyncedAt: null },
      agentRoot: null,
      agentFetchError: null,
    };
    const local = assembleControlCenterSnapshot({ ...base, agentToolsBase: "http://localhost:3020" });
    expect(local.checklist.find((c) => c.id === "agent_tools_url")?.status).toBe("warn");
    expect(local.toolUrls[0]?.url).toContain("http://localhost:3020/api/agent-tools/get-menu");

    const pub = assembleControlCenterSnapshot({ ...base, agentToolsBase: "https://app.roal.test" });
    expect(pub.checklist.find((c) => c.id === "agent_tools_url")?.status).toBe("ok");
    expect(pub.edgeBase).toBe("https://app.roal.test");
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
