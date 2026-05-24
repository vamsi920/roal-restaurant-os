import { describe, expect, it } from "vitest";
import { commitBlockedReason } from "@/lib/scanner/import-commit-guards";

describe("commitBlockedReason", () => {
  it("allows extracted and commit_failed retry", () => {
    expect(commitBlockedReason("extracted")).toBeNull();
    expect(commitBlockedReason("commit_failed")).toBeNull();
  });

  it("blocks committed and discarded", () => {
    expect(commitBlockedReason("committed")).toMatch(/already committed/i);
    expect(commitBlockedReason("discarded")).toMatch(/discarded/i);
  });

  it("blocks failed extraction", () => {
    expect(commitBlockedReason("extraction_failed")).toMatch(/scan/i);
  });
});
