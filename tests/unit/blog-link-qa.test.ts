import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  BLOG_POSTS,
  getAllPostSlugs,
  getAllPosts,
  getFeaturedPost,
  getPostBySlug,
  getRelatedPosts,
} from "@/lib/blog";
import { getBlogPostHref } from "@/lib/blog/href";
import { validateAllBlogLinks } from "@/lib/blog/validate-links";

const BLOG_ARTICLE_PAGE = join(process.cwd(), "app/blog/[slug]/page.tsx");

describe("blog link QA", () => {
  it("validateAllBlogLinks passes (related, inline, CTA)", () => {
    expect(() => validateAllBlogLinks()).not.toThrow();
  });

  it("blog article route exists for every slug", () => {
    expect(existsSync(BLOG_ARTICLE_PAGE)).toBe(true);
    for (const slug of getAllPostSlugs()) {
      expect(getPostBySlug(slug)?.slug).toBe(slug);
    }
  });

  it("index and featured card hrefs match registered slugs", () => {
    const slugs = new Set(getAllPostSlugs());

    for (const post of getAllPosts()) {
      const href = getBlogPostHref(post.slug);
      expect(href).toBe(`/blog/${post.slug}`);
      expect(slugs.has(post.slug)).toBe(true);
      expect(post.content).toBeTruthy();
    }

    const featured = getFeaturedPost();
    expect(getBlogPostHref(featured.slug)).toBe(`/blog/${featured.slug}`);
    expect(slugs.has(featured.slug)).toBe(true);
  });

  it("related posts resolve to real articles (no dead slugs)", () => {
    const slugs = new Set(getAllPostSlugs());

    for (const post of BLOG_POSTS) {
      for (const relatedSlug of post.content!.relatedSlugs) {
        expect(slugs.has(relatedSlug), `dead relatedSlug on ${post.slug}`).toBe(true);
        expect(relatedSlug).not.toBe(post.slug);
      }

      const related = getRelatedPosts(post);
      expect(related.length).toBeGreaterThan(0);
      for (const item of related) {
        expect(slugs.has(item.slug)).toBe(true);
        expect(item.slug).not.toBe(post.slug);
        expect(item.content).toBeTruthy();
        expect(getBlogPostHref(item.slug)).toBe(`/blog/${item.slug}`);
      }
    }
  });
});
