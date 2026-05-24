import { describe, expect, it } from "vitest";
import {
  AUTH_PAGE_ROBOTS,
  PRIVATE_PAGE_ROBOTS,
  PUBLIC_PAGE_ROBOTS,
} from "@/lib/seo/robots-metadata";

describe("robots metadata presets", () => {
  it("indexes public marketing pages", () => {
    expect(PUBLIC_PAGE_ROBOTS).toMatchObject({ index: true, follow: true });
  });

  it("noindexes auth pages but allows follow", () => {
    expect(AUTH_PAGE_ROBOTS).toMatchObject({ index: false, follow: true });
  });

  it("noindexes private dashboard surfaces", () => {
    expect(PRIVATE_PAGE_ROBOTS).toMatchObject({ index: false, follow: false });
  });
});
