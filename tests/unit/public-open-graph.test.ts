import { describe, expect, it } from "vitest";
import { buildPublicPageMetadata } from "@/lib/seo/public-open-graph";

describe("buildPublicPageMetadata", () => {
  it("adds the default share card image", () => {
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
    expect(meta.openGraph).toMatchObject({ images: [{ url: "/opengraph-image", width: 1200, height: 630 }] });
    expect(meta.twitter).toMatchObject({
      card: "summary_large_image",
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
    expect(meta.openGraph).toHaveProperty("images");
  });

  it("uses a page-specific share image when given", () => {
    const meta = buildPublicPageMetadata({
      title: "Post",
      description: "Excerpt",
      canonicalPath: "/blog/x",
      ogImage: "/blog/x/opengraph-image",
    });
    expect(meta.openGraph).toMatchObject({ images: [{ url: "/blog/x/opengraph-image" }] });
    expect(meta.twitter).toMatchObject({ images: ["/blog/x/opengraph-image"] });
  });
});
