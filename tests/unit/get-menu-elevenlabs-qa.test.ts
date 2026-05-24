import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

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

  it("shared helper exports fetch and invoke", () => {
    const lib = readFileSync(
      join(REPO, "lib/elevenlabs/fetch-synced-tool.ts"),
      "utf8"
    );
    expect(lib).toContain("fetchSyncedRoalTool");
    expect(lib).toContain("invokeSyncedRoalTool");
    expect(lib).toContain("get_menu_items");
  });
});
