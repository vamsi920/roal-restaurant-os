import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");
const read = (rel: string) => readFileSync(join(REPO, rel), "utf8");

describe("Live Agent responsive (prompt 31)", () => {
  it("structures the Phone host page: header, hero call, inbox, persona, collapsed Advanced", () => {
    const page = read("app/dashboard/restaurants/[id]/agent/page.tsx");

    expect(page).toContain("RestaurantLaunchGateCard");
    expect(page).toContain("loadRestaurantLaunchGate");
    expect(page).toContain("<PageHeader");
    expect(page).toContain("RESTAURANT_PHONE_HOST_LABEL");
    expect(page).toContain("<PhoneHostTestCall");
    expect(page).toContain("<KnowledgeSuggestionsInbox");
    expect(page).toContain("<HostPersonaCard");
    expect(page).toContain("<CollapsiblePanel");
    expect(page).toContain('title="Advanced"');
    expect(page).not.toContain("defaultOpen");
    expect(page).toContain("<MetaList");
    expect(page).toContain("Store phone");
    // Old per-page chrome and the KDS stylesheet are gone.
    expect(page).not.toContain("kds-workspace.css");
    expect(page).not.toContain("ws-page-head");
  });

  it("keeps long IDs and URLs contained on narrow screens", () => {
    const panel = read("app/dashboard/restaurants/[id]/VoiceAgentPanel.tsx");
    const harness = read("app/dashboard/restaurants/[id]/VoiceAgentTestHarness.tsx");

    expect(panel).toContain("truncate font-mono");
    expect(panel).toContain("break-all");
    expect(panel).toContain("overflow-x-auto");
    expect(harness).toContain("overflow-auto overscroll-contain");
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
