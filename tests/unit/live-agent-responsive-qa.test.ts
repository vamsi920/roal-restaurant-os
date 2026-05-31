import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");
const read = (rel: string) => readFileSync(join(REPO, rel), "utf8");

describe("Live Agent responsive (prompt 31)", () => {
  it("structures agent page header and embedded panel", () => {
    const page = read("app/dashboard/restaurants/[id]/agent/page.tsx");
    const panel = read("app/dashboard/restaurants/[id]/VoiceAgentPanel.tsx");
    const css = read("app/dashboard/restaurants/[id]/kds-workspace.css");

    expect(page).toContain("RestaurantLaunchGateCard");
    expect(page).toContain("loadRestaurantLaunchGate");
    expect(page).toContain("live-agent-page__header");
    expect(page).toContain("live-agent-page__inline-meta");
    expect(page).toContain("kds-workspace--agent");
    expect(page).toContain("overflow-x-hidden");
    expect(panel).toContain("voice-agent-panel");
    expect(css).toContain("Live Agent page responsive (prompt 31)");
  });

  it("keeps connect controls and diagnostics collapsible with wrap", () => {
    const panel = read("app/dashboard/restaurants/[id]/VoiceAgentPanel.tsx");
    const harness = read("app/dashboard/restaurants/[id]/VoiceAgentTestHarness.tsx");

    expect(panel).toContain("voice-agent-panel__controls");
    expect(panel).toContain("kds-thumb-btn min-h-11 w-full");
    expect(panel).toContain("voice-agent-panel__profile-table");
    expect(panel).toContain("break-all");
    expect(harness).toContain("voice-agent-harness");
    expect(harness).toContain("voice-agent-harness__advanced");
    expect(harness).not.toContain("min-w-[200px]");
    expect(harness).toContain('role="alert"');
  });

  it("uses real voice agent data loaders and sanitized errors", () => {
    const page = read("app/dashboard/restaurants/[id]/agent/page.tsx");
    const panel = read("app/dashboard/restaurants/[id]/VoiceAgentPanel.tsx");

    expect(page).toContain("loadRestaurantMenuSetupPageData");
    expect(page).toContain("voiceAgentCenter");
    expect(panel).toContain("sanitizeVoiceAgentDisplayError");
    expect(panel).toContain("connectVoiceAgentAction");
    expect(panel).not.toMatch(/demo|fake|placeholder agent/i);
  });
});
