import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ROAL_SYNCED_TOOL_NAMES,
  fetchSyncedRoalTool,
  invokeSyncedRoalTool,
} from "@/lib/elevenlabs/fetch-synced-tool";
import { ROAL_BAKED_TOOL_NAMES } from "@/lib/sync-elevenlabs-roal-tools";

const REPO = join(import.meta.dirname, "../..");

describe("get_menu_items ElevenLabs verification (launch 18)", () => {
  it("ships dedicated QA script using synced tool invoke", () => {
    const script = readFileSync(
      join(REPO, "scripts/qa-get-menu-elevenlabs.ts"),
      "utf8"
    );
    expect(script).toContain("fetchSyncedRoalTool");
    expect(script).toContain("invokeSyncedRoalTool");
    expect(script).toContain("non-empty categories");
    expect(script).toContain("non-empty items");
  });

  it("shared helper exports fetch and invoke with get_menu_items in canonical tool list", () => {
    expect(typeof fetchSyncedRoalTool).toBe("function");
    expect(typeof invokeSyncedRoalTool).toBe("function");
    expect(ROAL_SYNCED_TOOL_NAMES).toBe(ROAL_BAKED_TOOL_NAMES);
    expect(ROAL_SYNCED_TOOL_NAMES).toContain("get_menu_items");

    const lib = readFileSync(
      join(REPO, "lib/elevenlabs/fetch-synced-tool.ts"),
      "utf8"
    );
    expect(lib).toContain("ROAL_BAKED_TOOL_NAMES");
    expect(lib).toContain("ROAL_SYNCED_TOOL_NAMES = ROAL_BAKED_TOOL_NAMES");
  });

  it("get_menu_items response includes service_modes from profile", () => {
    const edge = readFileSync(
      join(REPO, "supabase/functions/get-menu/index.ts"),
      "utf8"
    );
    const harness = readFileSync(
      join(REPO, "lib/voice-agent/test-harness/build-get-menu.ts"),
      "utf8"
    );
    expect(edge).toContain("allows_pickup, allows_delivery");
    expect(edge).toContain("service_modes");
    expect(harness).toContain("serviceModesFromProfile");
    expect(harness).toContain("service_modes: serviceModes");
  });
});
