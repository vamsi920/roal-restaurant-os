import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO = join(import.meta.dirname, "../..");

describe("menu scanner UX (launch 12)", () => {
  it("ships sample menu fixture for live and e2e passes", () => {
    const png = join(REPO, "tests/fixtures/sample-menu.png");
    const buf = readFileSync(png);
    expect(buf.length).toBeGreaterThan(10_000);
    expect(buf[0]).toBe(0x89);
    expect(buf[1]).toBe(0x50);
  });

  it("MenuScanner uses owner-facing API error formatter", () => {
    const scanner = readFileSync(
      join(REPO, "app/dashboard/restaurants/[id]/MenuScanner.tsx"),
      "utf8"
    );
    expect(scanner).toContain("formatScannerApiError");
    expect(scanner).toContain('role="alert"');
    expect(scanner).toContain("Discard failed import");
  });
});
