import { describe, expect, it } from "vitest";
import {
  extractErrorHttpStatus,
  resolveMenuImageMimeType,
  validateMenuImageFile,
} from "@/lib/scanner/extract-menu";

function file(
  parts: Partial<{ name: string; type: string; size: number }>
): File {
  const size = parts.size ?? 1024;
  const blob = new Blob([new Uint8Array(size)], {
    type: parts.type ?? "image/jpeg",
  });
  return new File([blob], parts.name ?? "menu.jpg", {
    type: parts.type ?? "image/jpeg",
  });
}

describe("validateMenuImageFile", () => {
  it("accepts image with empty mime when extension is image", () => {
    expect(() =>
      validateMenuImageFile(file({ name: "menu.jpg", type: "", size: 100 }))
    ).not.toThrow();
  });

  it("rejects non-image types", () => {
    expect(() =>
      validateMenuImageFile(
        file({ name: "doc.pdf", type: "application/pdf", size: 100 })
      )
    ).toThrow(/not an image/i);
  });

  it("rejects files over 8 MB", () => {
    expect(() =>
      validateMenuImageFile(file({ size: 8 * 1024 * 1024 + 1 }))
    ).toThrow(/8 MB/i);
  });
});

describe("resolveMenuImageMimeType", () => {
  it("infers png from filename when type missing", () => {
    expect(resolveMenuImageMimeType(file({ name: "x.png", type: "" }))).toBe(
      "image/png"
    );
  });
});

describe("extractErrorHttpStatus", () => {
  it("maps validation errors to 400", () => {
    expect(extractErrorHttpStatus("image must be 8 MB or smaller")).toBe(400);
  });

  it("maps schema errors to 422", () => {
    expect(
      extractErrorHttpStatus("Gemini returned invalid menu structure: x")
    ).toBe(422);
  });
});
