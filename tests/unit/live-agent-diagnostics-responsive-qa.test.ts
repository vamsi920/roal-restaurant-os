import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");
const read = (rel: string) => readFileSync(join(REPO, rel), "utf8");

describe("Live Agent advanced diagnostics (prompt 34)", () => {
  it("keeps diagnostics collapsed with scroll/wrap regions", () => {
    const panel = read("app/dashboard/restaurants/[id]/VoiceAgentPanel.tsx");
    const css = read("app/dashboard/restaurants/[id]/kds-workspace.css");

    expect(panel).toContain("<details className=\"voice-agent-panel__advanced");
    expect(panel).not.toContain("<details open");
    expect(panel).toContain("voice-agent-panel__advanced-body");
    expect(panel).toContain("voice-agent-panel__tool-url-scroll");
    expect(panel).toContain("voice-agent-panel__profile-scroll");
    expect(panel).toContain("voice-agent-panel__copy-btn");
    expect(panel).toContain("overflow-x-auto");
    expect(panel).toContain("[overflow-wrap:anywhere]");
    expect(css).toContain("Live Agent advanced diagnostics (prompt 34)");
  });

  it("structures checklist, env secrets, and tool URL cards", () => {
    const panel = read("app/dashboard/restaurants/[id]/VoiceAgentPanel.tsx");

    expect(panel).toContain("voice-agent-panel__checklist");
    expect(panel).toContain("voice-agent-panel__env-secrets");
    expect(panel).toContain("voice-agent-panel__env-key");
    expect(panel).toContain("voice-agent-panel__tool-urls");
    expect(panel).toContain('aria-label={`Copy URL for ${tool.label}`}');
  });

  it("uses real control center data, not demo placeholders", () => {
    const panel = read("app/dashboard/restaurants/[id]/VoiceAgentPanel.tsx");

    expect(panel).toContain("center.checklist");
    expect(panel).toContain("center.envSecrets");
    expect(panel).toContain("center.toolUrls");
    expect(panel).not.toMatch(/lorem|fake url|demo agent/i);
  });
});
