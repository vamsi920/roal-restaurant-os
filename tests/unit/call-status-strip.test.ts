import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");

describe("CallStatusStrip", () => {
  it("shows live vs waiting labels without conversation text", () => {
    const strip = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/CallStatusStrip.tsx"),
      "utf8"
    );
    expect(strip).toContain("Call live");
    expect(strip).toContain("Waiting for calls");
    expect(strip).toContain("liveCount > 0");
    expect(strip).toContain("lastUpdatedAt");
    expect(strip).not.toContain("transcript");
    expect(strip).not.toContain("conversation");
  });
});
