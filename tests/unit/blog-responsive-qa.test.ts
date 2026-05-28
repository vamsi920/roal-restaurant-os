import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getAllPosts } from "@/lib/blog";
import { isValidBlogPublishedDate } from "@/lib/blog/dates";

const REPO = join(import.meta.dirname, "../..");
const read = (rel: string) => readFileSync(join(REPO, rel), "utf8");

describe("blog responsive (prompt 12)", () => {
  it("uses roster dates and ROAL Team bylines only (no fake customers)", () => {
    for (const post of getAllPosts()) {
      expect(isValidBlogPublishedDate(post.publishedAt)).toBe(true);
      const author = post.content?.author ?? "ROAL Team";
      expect(author).toBe("ROAL Team");
    }
    const roster = read("lib/blog/posts.ts");
    expect(roster).not.toMatch(/publishedAt:\s*"2025-/);
    expect(roster).not.toMatch(/testimonial|fake customer|Maria's Pizza/i);
  });

  it("scrolls category filters on phone and wraps long article titles", () => {
    const css = read("app/blog-theme.css");
    expect(css).toContain("Blog responsive (prompt 12)");
    expect(css).toMatch(
      /@media \(max-width: 767px\)[\s\S]*\.blog-category-filter[\s\S]*overflow-x:\s*auto/
    );
    expect(css).toContain(".blog-article-header__title");
    expect(css).toMatch(/\.blog-article-header__title[\s\S]*overflow-wrap:\s*anywhere/);
    expect(css).toMatch(/\.blog-article-section__p pre[\s\S]*overflow-x:\s*auto/);
  });

  it("clips blog shell and article overflow", () => {
    const index = read("app/blog/page.tsx");
    const layout = read("components/blog/blog-article-layout.tsx");
    expect(index).toContain("overflow-x-clip");
    expect(layout).toContain("overflow-x-clip");
  });
});
