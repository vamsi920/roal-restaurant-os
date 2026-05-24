import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getAllPosts, getFeaturedPosts } from "@/lib/blog";
import { BLOG_FEATURED_COUNT } from "@/lib/blog/index-copy";
import { buildBlogIndexAeoJsonLd } from "@/lib/blog/index-aeo-json-ld";

const REPO = join(import.meta.dirname, "../..");

describe("blog index layout", () => {
  it("surfaces three featured posts then the rest", () => {
    const featured = getFeaturedPosts(BLOG_FEATURED_COUNT);
    expect(featured).toHaveLength(BLOG_FEATURED_COUNT);
    const slugs = new Set(featured.map((p) => p.slug));
    const grid = getAllPosts().filter((p) => !slugs.has(p.slug));
    expect(grid.length).toBe(getAllPosts().length - BLOG_FEATURED_COUNT);
  });

  it("keeps AEO in JSON-LD only, not visible on page", () => {
    const page = readFileSync(join(REPO, "app/blog/page.tsx"), "utf8");
    expect(page).not.toMatch(/BlogIndexAeo(?!JsonLd)/);
    expect(page).toContain("BlogIndexAeoJsonLd");
    expect(buildBlogIndexAeoJsonLd()["@type"]).toBe("FAQPage");
  });

  it("uses journal hero without marketing CTAs", () => {
    const hero = readFileSync(join(REPO, "components/blog/blog-index-hero.tsx"), "utf8");
    expect(hero).toContain("blog-index-hero__title");
    expect(hero).not.toContain("PublicCtaActions");
    expect(hero).not.toContain("MarketingPageHero");
  });
});
