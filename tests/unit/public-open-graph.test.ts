import { describe, expect, it } from "vitest";
import { buildPublicPageMetadata } from "@/lib/seo/public-open-graph";

describe("buildPublicPageMetadata", () => {
  it("uses text-first OG without images", () => {
    const meta = buildPublicPageMetadata({
      title: "Test — ROAL",
      description: "Test description for social previews.",
      canonicalPath: "/demo",
    });

    expect(meta.openGraph).toMatchObject({
      title: "Test — ROAL",
      description: "Test description for social previews.",
      type: "website",
      siteName: "ROAL",
      locale: "en_US",
    });
    expect(meta.openGraph).not.toHaveProperty("images");
    expect(meta.twitter).toMatchObject({
      card: "summary",
      title: "Test — ROAL",
      description: "Test description for social previews.",
    });
  });

  it("supports article OG type for blog posts", () => {
    const meta = buildPublicPageMetadata({
      title: "Article",
      description: "Excerpt",
      canonicalPath: "/blog/test",
      openGraphType: "article",
      article: { authors: ["ROAL Team"], tags: ["Ops"] },
    });

    expect(meta.openGraph).toMatchObject({
      type: "article",
      authors: ["ROAL Team"],
      tags: ["Ops"],
    });
    expect(meta.openGraph).not.toHaveProperty("images");
  });
});
