import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");
const read = (rel: string) => readFileSync(join(REPO, rel), "utf8");

describe("Live Agent phone hero (prompt 32)", () => {
  it("shows compact readiness and menu sync above the fold on phone", () => {
    const page = read("app/dashboard/restaurants/[id]/agent/page.tsx");
    const css = read("app/dashboard/restaurants/[id]/kds-workspace.css");

    expect(page).toContain("menuSyncBadgeLabel");
    expect(page).toContain("menuSyncSummary");
    expect(page).toContain("live-agent-page__hero-line");
    expect(page).toContain("live-agent-page__menu-sync");
    expect(page).toContain("live-agent-page__stats mt-4 hidden");
    expect(page).toContain("live-agent-page__meta-details");
    expect(css).toContain("Live Agent phone hero (prompt 32)");
  });

  it("hides developer-heavy embedded chrome on phone", () => {
    const panel = read("app/dashboard/restaurants/[id]/VoiceAgentPanel.tsx");

    expect(panel).toContain("voice-agent-panel--embedded");
    expect(panel).toContain("voice-agent-panel__embedded-refresh");
    expect(panel).toContain("voice-agent-panel__embedded-chrome hidden");
    expect(panel).toContain("voice-agent-panel__connect-hint");
    expect(panel).toContain("voice-agent-panel__agent-id-line mt-2 hidden");
    expect(panel).toContain("Add required server settings before connecting");
  });

  it("keeps real voice agent snapshot on the page", () => {
    const page = read("app/dashboard/restaurants/[id]/agent/page.tsx");
    expect(page).toContain("voiceAgentCenter");
    expect(page).toContain("lastSyncToolsBaked");
    expect(page).not.toMatch(/demo|fake|placeholder/i);
  });
});
