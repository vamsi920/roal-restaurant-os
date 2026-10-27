import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");
const read = (rel: string) => readFileSync(join(REPO, rel), "utf8");

describe("Voice test harness responsive (prompt 35)", () => {
  it("keeps harness inside the collapsed Advanced panel on the agent route", () => {
    const harness = read("app/dashboard/restaurants/[id]/VoiceAgentTestHarness.tsx");
    const page = read("app/dashboard/restaurants/[id]/agent/page.tsx");

    expect(page).toContain('variant="test-call"');
    expect(page).toContain('id="tool-scenarios"');
    expect(page).toMatch(/<CollapsiblePanel[\s\S]*<VoiceAgentTestHarness[\s\S]*<\/CollapsiblePanel>/);
    expect(harness).toContain("<details");
    expect(harness).not.toContain("<details open");
  });

  it("structures scenarios, session, results logs, and scroll areas", () => {
    const harness = read("app/dashboard/restaurants/[id]/VoiceAgentTestHarness.tsx");

    expect(harness).toContain("Run scenario");
    expect(harness).toContain('aria-label="Scenario steps"');
    expect(harness).toContain("aria-expanded={expanded}");
    expect(harness).toContain("overflow-auto overscroll-contain");
    expect(harness).toContain("btn-primary max-sm:w-full");
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
