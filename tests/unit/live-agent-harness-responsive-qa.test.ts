import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");
const read = (rel: string) => readFileSync(join(REPO, rel), "utf8");

describe("Voice test harness responsive (prompt 35)", () => {
  it("keeps harness optional and collapsed in details on agent route", () => {
    const harness = read("app/dashboard/restaurants/[id]/VoiceAgentTestHarness.tsx");
    const page = read("app/dashboard/restaurants/[id]/agent/page.tsx");
    const css = read("app/dashboard/restaurants/[id]/kds-workspace.css");

    expect(page).toContain('variant="test-call"');
    expect(harness).toContain("voice-agent-harness-shell--optional");
    expect(harness).toContain("<details");
    expect(harness).not.toContain("<details open");
    expect(css).toContain("Voice test harness responsive (prompt 35)");
  });

  it("structures scenarios, session, results logs, and scroll areas", () => {
    const harness = read("app/dashboard/restaurants/[id]/VoiceAgentTestHarness.tsx");

    expect(harness).toContain("voice-agent-harness__scenarios");
    expect(harness).toContain("voice-agent-harness__results");
    expect(harness).toContain("voice-agent-harness__step-log");
    expect(harness).toContain("voice-agent-harness__step-toggle");
    expect(harness).toContain("kds-thumb-btn min-h-11 w-full");
    expect(harness).toContain("useState(true)");
    expect(harness).toContain("roal-harness-");
  });

  it("uses real harness actions and discourages fake call framing", () => {
    const harness = read("app/dashboard/restaurants/[id]/VoiceAgentTestHarness.tsx");

    expect(harness).toContain("runVoiceAgentHarnessScenarioAction");
    expect(harness).toContain("HARNESS_SCENARIOS");
    expect(harness).toContain("live phone calls");
    expect(harness).not.toMatch(/simulate call|fake call|demo caller/i);
  });
});
