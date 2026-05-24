import { describe, expect, it } from "vitest";
import { ROBOTS_DISALLOW_PATHS } from "@/lib/seo/robots-txt";

describe("ROBOTS_DISALLOW_PATHS", () => {
  it("blocks API, auth callbacks, and dashboard", () => {
    expect(ROBOTS_DISALLOW_PATHS).toContain("/api/");
    expect(ROBOTS_DISALLOW_PATHS).toContain("/auth/");
    expect(ROBOTS_DISALLOW_PATHS).toContain("/dashboard");
  });
});
