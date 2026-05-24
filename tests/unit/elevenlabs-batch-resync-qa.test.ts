import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");

describe("ElevenLabs batch resync (launch 17)", () => {
  it("ships resync-all script with list-only and verify", () => {
    const script = readFileSync(
      join(REPO, "scripts/resync-all-elevenlabs-restaurants.ts"),
      "utf8"
    );
    expect(script).toContain("--list-only");
    expect(script).toContain("verifyRestaurantTools");
    expect(script).toContain("restaurant_tools_baked");
    expect(script).toContain("readElevenLabsPhonePersonalizationWebhook");
    expect(script).toContain("redactUrl");
  });

  it("list script selects saved agent ids only", () => {
    const list = readFileSync(
      join(REPO, "scripts/list-elevenlabs-restaurants.ts"),
      "utf8"
    );
    expect(list).toContain("elevenlabs_agent_id");
    expect(list).toContain("elevenlabs_last_sync_at");
  });
});
