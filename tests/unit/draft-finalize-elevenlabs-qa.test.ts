import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");

describe("draft/finalize ElevenLabs verification (launch 19)", () => {
  it("ships QA script with KDS, receipt, usage, idempotency checks", () => {
    const script = readFileSync(
      join(REPO, "scripts/qa-draft-finalize-elevenlabs.ts"),
      "utf8"
    );
    expect(script).toContain("sync_draft_order (ElevenLabs-exact)");
    expect(script).toContain("phone_order_receipts");
    expect(script).toContain("order_completed");
    expect(script).toContain("reject placeholder customer");
    expect(script).toContain("ROAL_IDEMPOTENCY_HEADER");
  });

  it("invoke helper returns idempotency replay header", () => {
    const lib = readFileSync(
      join(REPO, "lib/elevenlabs/fetch-synced-tool.ts"),
      "utf8"
    );
    expect(lib).toContain("x-roal-idempotent-replay");
    expect(lib).toContain("extraHeaders");
  });
});
