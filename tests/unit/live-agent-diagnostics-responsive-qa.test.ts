import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");
const read = (rel: string) => readFileSync(join(REPO, rel), "utf8");

describe("Live Agent advanced diagnostics (prompt 34)", () => {
  it("keeps diagnostics folded behind disclosures with scroll/wrap regions", () => {
    const panel = read("app/dashboard/restaurants/[id]/VoiceAgentPanel.tsx");

    expect(panel).toContain("Advanced diagnostics");
    expect(panel).toContain("function DiagnosticDisclosure");
    expect(panel).toContain("<details");
    expect(panel).not.toContain("<details open");
    expect(panel).toContain("overflow-x-auto");
    expect(panel).toContain("[overflow-wrap:anywhere]");
  });

  it("structures checklist, env secrets, profile variables, and tool URL cards", () => {
    const panel = read("app/dashboard/restaurants/[id]/VoiceAgentPanel.tsx");

    expect(panel).toContain('aria-label="Setup checklist"');
    expect(panel).toContain('title="Environment secrets"');
    expect(panel).toContain('title="Profile variables"');
    expect(panel).toContain('title="Webhook tool URLs"');
    expect(panel).toContain("label={`Copy URL for ${tool.label}`}");
    expect(panel).toContain('label="Copy agent ID"');
  });

  it("uses real control center data, not demo placeholders", () => {
    const panel = read("app/dashboard/restaurants/[id]/VoiceAgentPanel.tsx");

    expect(panel).toContain("center.checklist");
    expect(panel).toContain("center.envSecrets");
    expect(panel).toContain("center.toolUrls");
    expect(panel).not.toMatch(/lorem|fake url|demo agent/i);
  });
});
