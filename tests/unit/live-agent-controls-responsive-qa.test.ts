import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");
const read = (rel: string) => readFileSync(join(REPO, rel), "utf8");

describe("Live Agent connect controls (prompt 33)", () => {
  it("structures agent id, actions, refresh, and feedback regions", () => {
    const panel = read("app/dashboard/restaurants/[id]/VoiceAgentPanel.tsx");
    const css = read("app/dashboard/restaurants/[id]/kds-workspace.css");

    expect(panel).toContain("voice-agent-panel__controls");
    expect(panel).toContain("voice-agent-panel__agent-id-input");
    expect(panel).toContain("voice-agent-panel__actions");
    expect(panel).toContain("voice-agent-panel__btn--connect");
    expect(panel).toContain("voice-agent-panel__btn--resync");
    expect(panel).toContain("voice-agent-panel__refresh");
    expect(panel).toContain("voice-agent-panel__feedback");
    expect(panel).toContain("voice-agent-panel__success");
    expect(panel).toContain("voice-agent-panel__error");
    expect(panel).toContain("ElevenLabs agent ID");
    expect(css).toContain("Live Agent connect controls (prompt 33)");
  });

  it("uses touch-friendly full-width buttons on phone", () => {
    const panel = read("app/dashboard/restaurants/[id]/VoiceAgentPanel.tsx");

    expect(panel).toContain("kds-thumb-btn min-h-11 w-full");
    expect(panel).toContain("disabled={connectDisabled}");
    expect(panel).toContain("disabled={resyncDisabled}");
    expect(panel).toContain("aria-busy={busy === \"connect\"}");
    expect(panel).toContain("aria-live=\"assertive\"");
  });

  it("keeps real connect actions and sanitized errors", () => {
    const panel = read("app/dashboard/restaurants/[id]/VoiceAgentPanel.tsx");

    expect(panel).toContain("connectVoiceAgentAction");
    expect(panel).toContain("resyncVoiceAgentAction");
    expect(panel).toContain("sanitizeVoiceAgentDisplayError");
    expect(panel).not.toMatch(/demo|fake agent/i);
  });
});
