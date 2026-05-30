import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  extractMenuSizeHint,
  menuSnapshotsMatch,
  redactSecrets,
  toolUrlBakedForRestaurant,
} from "@/lib/voice-agent/qa/live-helpers";

const REPO = join(import.meta.dirname, "../..");

describe("voice agent QA live helpers", () => {
  it("extractMenuSizeHint parses modifier and simple forms", () => {
    const withMods =
      "Menu size hint: 4 categories, 24 items, 8 modifier options—confirm required";
    expect(extractMenuSizeHint(withMods)).toEqual({
      categoryCount: 4,
      itemCount: 24,
      modifierCount: 8,
    });
    const simple = "Menu size hint: 2 categories, 10 items.";
    expect(extractMenuSizeHint(simple)).toEqual({
      categoryCount: 2,
      itemCount: 10,
      modifierCount: null,
    });
  });

  it("menuSnapshotsMatch compares db snapshot to hint", () => {
    expect(
      menuSnapshotsMatch(
        { categoryCount: 2, itemCount: 10, modifierCount: 4 },
        { categoryCount: 2, itemCount: 10, modifierCount: 4 }
      )
    ).toBe(true);
    expect(
      menuSnapshotsMatch(
        { categoryCount: 2, itemCount: 11, modifierCount: null },
        { categoryCount: 2, itemCount: 10, modifierCount: 4 }
      )
    ).toBe(false);
  });

  it("toolUrlBakedForRestaurant detects encoded restaurant id", () => {
    const rid = "9d3263d1-4d9d-4f89-bfc5-160e2cca1855";
    const url = `https://x.supabase.co/functions/v1/get-menu?restaurant_id=${encodeURIComponent(rid)}`;
    expect(toolUrlBakedForRestaurant(url, rid)).toBe(true);
  });

  it("redactSecrets strips api keys", () => {
    expect(redactSecrets("xi-api-key sk-abcdefghijklmnop1234")).not.toContain(
      "sk-abcdefghijklmnop1234"
    );
  });
});

describe("voice agent QA live scripts", () => {
  it("ships provision and menu auto-sync scripts", () => {
    const provision = readFileSync(
      join(REPO, "scripts/qa-voice-agent-provision.ts"),
      "utf8"
    );
    const menuSync = readFileSync(
      join(REPO, "scripts/qa-menu-auto-sync.ts"),
      "utf8"
    );
    expect(provision).toContain("provisionRestaurantVoiceAgent");
    expect(provision).toContain("verifyBakedToolsForRestaurant");
    expect(provision).toContain("elevenlabs_agent_id");
    expect(menuSync).toContain("syncRestaurantAgentAfterContentChange");
    expect(menuSync).toContain("VOICE_AGENT_CONTENT_SYNC_TRIGGERS.menu");
    expect(menuSync).toContain("menuSnapshotsMatch");
    expect(menuSync).toContain("ROAL QA Sync Probe");
  });
});
