import { describe, expect, it } from "vitest";
import { SITEMAP_PUBLIC_PATHS } from "@/app/sitemap";

const REQUIRED = [
  "",
  "/pricing",
  "/blog",
  "/about",
  "/demo",
  "/contact",
  "/security",
  "/privacy",
  "/terms",
] as const;

describe("SITEMAP_PUBLIC_PATHS", () => {
  it("includes all launch marketing routes", () => {
    for (const path of REQUIRED) {
      expect(SITEMAP_PUBLIC_PATHS).toContain(path);
    }
    expect(SITEMAP_PUBLIC_PATHS).toHaveLength(REQUIRED.length);
  });
});
