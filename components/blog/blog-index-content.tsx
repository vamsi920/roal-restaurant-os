"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { BlogCategoryFilter } from "@/components/blog/blog-category-filter";
import { BlogIndexFeatured } from "@/components/blog/blog-index-featured";
import { BlogPostCard } from "@/components/blog/blog-post-card";
import { BLOG_FEATURED_COUNT, BLOG_INDEX_COPY } from "@/lib/blog/index-copy";
import { BLOG_CATEGORY_SLUGS } from "@/lib/blog/categories";
import type { BlogCategorySlug } from "@/lib/blog/categories";
import {
  BLOG_INDEX_RESULTS_ID,
  type BlogFilterValue,
} from "@/lib/blog/filter";
import { getBlogFilterLabel } from "@/lib/blog/filter-label";
import { getFeaturedPosts } from "@/lib/blog/index";
import type { BlogPost } from "@/lib/blog/types";
import { cn } from "@/lib/cn";

type Props = {
  posts: BlogPost[];
};

function parseCategoryParam(raw: string | null): BlogFilterValue {
  if (!raw || raw === "all") return "all";
  return BLOG_CATEGORY_SLUGS.includes(raw as BlogCategorySlug)
    ? (raw as BlogCategorySlug)
    : "all";
}

export function BlogIndexContent({ posts }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialFilter = parseCategoryParam(searchParams.get("category"));
  const [filter, setFilter] = useState<BlogFilterValue>(initialFilter);
  const featuredPosts = useMemo(() => getFeaturedPosts(BLOG_FEATURED_COUNT), []);
  const featuredSlugs = useMemo(
    () => new Set(featuredPosts.map((p) => p.slug)),
    [featuredPosts]
  );

  const setFilterAndUrl = useCallback(
    (next: BlogFilterValue) => {
      setFilter(next);
      const params = new URLSearchParams(searchParams.toString());
      if (next === "all") params.delete("category");
      else params.set("category", next);
      const q = params.toString();
      router.replace(q ? `/blog?${q}` : "/blog", { scroll: false });
    },
    [router, searchParams]
  );

  const filtered = useMemo(() => {
    if (filter === "all") return posts;
    return posts.filter((p) => p.categorySlugs.includes(filter));
  }, [posts, filter]);

  const showFeatured = filter === "all";
  const gridPosts = useMemo(() => {
    const base = showFeatured
      ? filtered.filter((p) => !featuredSlugs.has(p.slug))
      : filtered;
    return base;
  }, [filtered, featuredSlugs, showFeatured]);

  const statusMessage = `${getBlogFilterLabel(filter)}: showing ${filtered.length} ${
    filtered.length === 1 ? "article" : "articles"
  }`;

  const { allPosts } = BLOG_INDEX_COPY;

  return (
    <section className="blog-index" aria-labelledby="blog-index-list-heading">
      <div className="landing-wrap landing-wrap-tight">
        <h2 id="blog-index-list-heading" className="sr-only">
          Articles
        </h2>

        <BlogCategoryFilter
          value={filter}
          onChange={setFilterAndUrl}
          resultsId={BLOG_INDEX_RESULTS_ID}
        />

        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {statusMessage}
        </p>

        <div id={BLOG_INDEX_RESULTS_ID}>
          {filtered.length === 0 ? (
            <p className="blog-index__empty" role="status">
              No articles in this category yet. Try another filter.
            </p>
          ) : (
            <>
              {showFeatured ? <BlogIndexFeatured posts={featuredPosts} /> : null}

              {gridPosts.length > 0 ? (
                <>
                  <h2
                    id={allPosts.titleId}
                    className={cn(
                      "blog-index__section-label",
                      showFeatured && "blog-index__section-label--spaced"
                    )}
                  >
                    {allPosts.label}
                  </h2>
                  <ul
                    className="blog-index__grid blog-index__grid--compact"
                    aria-label={statusMessage}
                  >
                    {gridPosts.map((post) => (
                      <li key={post.slug}>
                        <BlogPostCard post={post} compact />
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
