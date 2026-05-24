import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { sanitizeVoiceAgentDisplayError } from "@/lib/voice-agent/sanitize-display-error";

const REPO = join(import.meta.dirname, "../..");

describe("voice agent panel (launch 15)", () => {
  it("connect action sanitizes thrown errors", () => {
    const actions = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/voice-agent-actions.ts"),
      "utf8"
    );
    expect(actions).toContain("throw new Error(safeMessage)");
    expect(actions).toContain("sanitizeVoiceAgentDisplayError(message)");
  });

  it("panel shows env gate, alerts, and next steps", () => {
    const panel = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/VoiceAgentPanel.tsx"),
      "utf8"
    );
    expect(panel).toContain("Connect is disabled until required server secrets");
    expect(panel).toContain('role="alert"');
    expect(panel).toContain("voice test harness");
    expect(panel).toContain("Connect & sync");
    expect(panel).toContain("Re-sync");
  });

  it("sanitizes API key patterns for UI display", () => {
    const out = sanitizeVoiceAgentDisplayError(
      "ElevenLabs 401: invalid xi-api-key sk-abcdefghijklmnop1234"
    );
    expect(out).not.toContain("sk-abcdefghijklmnop1234");
    expect(out).toContain("[redacted]");
  });

  it("ships voice agent panel QA script", () => {
    const script = readFileSync(
      join(REPO, "scripts/qa-voice-agent-panel.ts"),
      "utf8"
    );
    expect(script).toContain("restaurant_tools_baked");
    expect(script).toContain("elevenlabs_agent_id");
    expect(script).toContain("redactSecrets");
  });
});
