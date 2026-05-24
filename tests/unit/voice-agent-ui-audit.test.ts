import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");

describe("ElevenLabs dashboard UI audit", () => {
  it("KDS page mounts voice panel and harness", () => {
    const page = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/page.tsx"),
      "utf8"
    );
    expect(page).toContain("loadVoiceAgentControlCenter");
    expect(page).toContain("VoiceAgentPanel");
    expect(page).toContain("VoiceAgentTestHarness");
  });

  it("control panel uses voice-agent-actions and input-base", () => {
    const panel = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/VoiceAgentPanel.tsx"),
      "utf8"
    );
    expect(panel).toContain("connectVoiceAgentAction");
    expect(panel).toContain("resyncVoiceAgentAction");
    expect(panel).toContain("input-base");
    expect(panel).toContain("voiceBlocked");
    expect(panel).toContain("Agent connected and synced.");
    expect(panel).toContain("Agent re-synced successfully.");
    expect(panel).toContain('role="alert"');
    expect(panel).toContain("voice test harness");
    expect(panel).not.toContain("elevenlabs-actions");
  });

  it("test harness uses styled input-base not missing input-field", () => {
    const harness = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/VoiceAgentTestHarness.tsx"),
      "utf8"
    );
    expect(harness).toContain("input-base");
    expect(harness).not.toMatch(/\binput-field\b/);
    expect(harness).toContain("runVoiceAgentHarnessScenarioAction");
  });
});
