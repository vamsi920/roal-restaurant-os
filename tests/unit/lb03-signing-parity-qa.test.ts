import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");

describe("LB-03 signing secret parity (launch 20)", () => {
  it("ships ensure + verify scripts", () => {
    const ensure = readFileSync(
      join(REPO, "scripts/ensure-agent-tool-signing-parity.ts"),
      "utf8"
    );
    expect(ensure).toContain("AGENT_TOOL_SIGNING_SECRET");
    expect(ensure).toContain("supabase secrets set");
    expect(ensure).toContain("resync:elevenlabs-all");

    const qa = readFileSync(
      join(REPO, "scripts/qa-lb03-signing-parity.ts"),
      "utf8"
    );
    expect(qa).toContain("mintAgentToolToken");
    expect(qa).toContain("Edge get-menu accepts signed roal1");
  });
});
