import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");

describe("LB-01 phone stack QA (launch 16)", () => {
  it("ships lb01 verification script with ElevenLabs-exact get_menu simulation", () => {
    const script = readFileSync(
      join(REPO, "scripts/qa-lb01-phone-stack.ts"),
      "utf8"
    );
    expect(script).toContain("get_menu_items (ElevenLabs-exact simulation)");
    expect(script).toContain("readElevenLabsPhonePersonalizationWebhook");
    expect(script).toContain("conversation-init returns restaurant vars");
    expect(script).toContain("remaining_human_steps");
    expect(script).toContain("redactUrl");
  });

  it("documents LB-01 close criteria in blockers doc", () => {
    const blockers = readFileSync(
      join(REPO, "docs/LAUNCH_BLOCKERS.md"),
      "utf8"
    );
    expect(blockers).toContain("LB-01");
    expect(blockers).toMatch(/get_menu_items|Twilio|DNS/i);
  });
});
