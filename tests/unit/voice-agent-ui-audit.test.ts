import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");
const read = (rel: string) => readFileSync(join(REPO, rel), "utf8");

describe("Phone host is owner-simple (no setup plumbing on screen)", () => {
  it("KDS and menu pages are orders/menu-only; the phone host page has no developer panels", () => {
    const page = read("app/dashboard/restaurants/[id]/page.tsx");
    const agent = read("app/dashboard/restaurants/[id]/agent/page.tsx");
    expect(page).toContain("<LiveOrdersPanel");
    expect(agent).toContain("<PageHeader");
    expect(agent).toContain("<PhoneHostTestCall");
    expect(agent).toContain("<HostPersonaCard");
    expect(agent).toContain("<PhoneNumberCard");
    expect(agent).toContain("voiceHostStateFromProfile");
    // Code identifiers like getElevenLabsAgentId are fine; words owners would read are not.
    const visible = agent.replace(/\b\w*ElevenLabs\w*\b/g, "");
    for (const plumbing of ["VoiceAgentPanel", "VoiceAgentTestHarness", "Advanced", "webhook", "ElevenLabs", "agent ID"]) {
      expect(visible).not.toContain(plumbing);
    }
  });

  it("the dashboard sets up and syncs every location's host in the background", () => {
    const shell = read("components/dashboard/app-shell.tsx");
    const keeper = read("components/dashboard/voice-host-keeper.tsx");
    expect(shell).toContain("<VoiceHostKeeper");
    expect(keeper).toContain("/voice-host");
  });
});
