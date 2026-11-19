import { describe, expect, it } from "vitest";
import { isPixelPath } from "@/lib/meta-pixel";

describe("isPixelPath", () => {
  it("allows public marketing pages", () => {
    for (const p of ["/", "/try", "/pricing", "/blog/some-post", "/signup", "/dashboards-guide"]) {
      expect(isPixelPath(p)).toBe(true);
    }
  });

  it("blocks private workspace, admin and api paths", () => {
    for (const p of ["/dashboard", "/dashboard/onboarding", "/admin", "/admin/ops", "/api/try"]) {
      expect(isPixelPath(p)).toBe(false);
    }
  });
});
