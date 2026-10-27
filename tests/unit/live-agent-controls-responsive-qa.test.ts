import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");
const read = (rel: string) => readFileSync(join(REPO, rel), "utf8");

describe("Live Agent connect controls (prompt 33)", () => {
  it("structures agent id, actions, refresh, and feedback regions", () => {
    const panel = read("app/dashboard/restaurants/[id]/VoiceAgentPanel.tsx");

    expect(panel).toContain("ElevenLabs agent ID");
    expect(panel).toContain("htmlFor={`voice-agent-id-${restaurantId}`}");
    expect(panel).toContain("Connect & sync");
    expect(panel).toContain("Sync now");
    expect(panel).toContain("<RefreshButton");
    expect(panel).toContain("Refresh status");
    expect(panel).toContain('<Notice tone="ok" title={success}');
    expect(panel).toContain('<Notice tone="bad" title={error} role="alert"');
    expect(panel).toContain('id="connection"');
  });

  it("uses full-width primary actions on phone and busy states", () => {
    const panel = read("app/dashboard/restaurants/[id]/VoiceAgentPanel.tsx");

    expect(panel).toContain("btn-primary max-sm:w-full");
    expect(panel).toContain("disabled={connectDisabled}");
    expect(panel).toContain("disabled={resyncDisabled}");
    expect(panel).toContain("aria-busy={busy === \"connect\"}");
    expect(panel).toContain("aria-busy={busy === \"resync\"}");
  });

  it("keeps real connect actions and sanitized errors", () => {
    const panel = read("app/dashboard/restaurants/[id]/VoiceAgentPanel.tsx");

    expect(panel).toContain("connectVoiceAgentAction");
    expect(panel).toContain("resyncVoiceAgentAction");
    expect(panel).toContain("sanitizeVoiceAgentDisplayError");
    expect(panel).not.toMatch(/demo|fake agent/i);
  });
});
