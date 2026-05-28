import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");

describe("ElevenLabs dashboard UI audit", () => {
  it("KDS and menu pages are orders/menu-only; voice UI on agent route", () => {
    const page = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/page.tsx"),
      "utf8"
    );
    const workspace = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/menu/MenuSetupWorkspace.tsx"),
      "utf8"
    );
    const agent = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/agent/page.tsx"),
      "utf8"
    );
    expect(page).toContain("<LiveOrdersPanel");
    expect(page).not.toContain("VoiceAgentPanel");
    expect(workspace).not.toContain("VoiceAgentPanel");
    expect(agent).toContain("<VoiceAgentPanel");
    expect(agent).toContain("embedded");
    expect(agent).toContain("kds-workspace--agent");
    expect(agent).toContain("loadRestaurantMenuSetupPageData");
    expect(
      readFileSync(
        join(REPO, "app/dashboard/restaurants/[id]/VoiceAgentPanel.tsx"),
        "utf8"
      )
    ).toContain("connectVoiceAgentAction");
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
    expect(panel).toContain('setSuccess("Agent re-synced.")');
    expect(panel).toContain('role="alert"');
    expect(panel).toContain("Advanced diagnostics");
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
