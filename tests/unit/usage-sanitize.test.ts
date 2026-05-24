import { describe, expect, it } from "vitest";
import { sanitizeUsageMetadata, truncateSessionId } from "@/lib/usage/sanitize";

describe("sanitizeUsageMetadata", () => {
  it("redacts forbidden keys and secret-like values", () => {
    const out = sanitizeUsageMetadata({
      tool: "sync_draft_order",
      authorization: "Bearer roal1.abc.def",
      nested: {
        customer_phone: "555-010-2233",
        items: [{ name: "Burger" }],
        note: "Bearer sk-live-abcdef",
      },
    });
    expect(out.authorization).toBe("[redacted]");
    expect(out.nested).toMatchObject({
      customer_phone: "[redacted]",
      items: "[redacted]",
      note: "[redacted]",
    });
  });

  it("keeps safe operational fields", () => {
    const out = sanitizeUsageMetadata({
      import_id: "11111111-1111-4111-8111-111111111111",
      outcome: "extraction_failed",
      http_status: 422,
      line_count: 2,
    });
    expect(out).toEqual({
      import_id: "11111111-1111-4111-8111-111111111111",
      outcome: "extraction_failed",
      http_status: 422,
      line_count: 2,
    });
  });
});

describe("truncateSessionId", () => {
  it("truncates long session ids to 128 chars", () => {
    const long = "x".repeat(200);
    expect(truncateSessionId(long)?.length).toBe(128);
  });
});
