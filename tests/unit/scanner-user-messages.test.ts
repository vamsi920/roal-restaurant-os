import { describe, expect, it } from "vitest";
import { formatScannerApiError } from "@/lib/scanner/scanner-user-messages";

describe("formatScannerApiError", () => {
  it("maps env misconfig to owner-friendly copy", () => {
    expect(
      formatScannerApiError(
        { error: "Environment configuration is invalid" },
        503
      )
    ).toMatch(/not available right now/i);
    expect(formatScannerApiError({ error: "Environment configuration is invalid" }, 503)).not.toMatch(
      /configure.*server/i
    );
  });

  it("maps invalid menu structure to retry guidance", () => {
    expect(
      formatScannerApiError(
        { error: "Gemini returned invalid menu structure: bad price" },
        422
      )
    ).toMatch(/could not read a valid menu/i);
  });

  it("preserves clear client validation messages", () => {
    expect(
      formatScannerApiError({ error: "image must be 8 MB or smaller" }, 400)
    ).toBe("image must be 8 MB or smaller");
  });

  it("handles generic 502", () => {
    expect(formatScannerApiError({}, 502)).toMatch(/well-lit photo/i);
  });
});
