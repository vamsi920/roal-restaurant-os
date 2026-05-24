import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/auth/safe-next";

describe("safeNextPath", () => {
  it("allows relative paths", () => {
    expect(safeNextPath("/dashboard/restaurants")).toBe(
      "/dashboard/restaurants"
    );
  });

  it("blocks open redirects", () => {
    expect(safeNextPath("//evil.com")).toBe("/dashboard");
    expect(safeNextPath("https://evil.com")).toBe("/dashboard");
    expect(safeNextPath("/\\evil")).toBe("/dashboard");
  });

  it("uses fallback when empty", () => {
    expect(safeNextPath(null)).toBe("/dashboard");
    expect(safeNextPath(undefined, "/login")).toBe("/login");
  });
});
