import Link from "next/link";
import { BlogIndexFeatured } from "@/components/blog/blog-index-featured";
import { BlogPostCard } from "@/components/blog/blog-post-card";
import { BlogTopicChips } from "@/components/blog/blog-topic-chips";
import { BLOG_CATEGORIES, BLOG_CATEGORY_BLURBS } from "@/lib/blog/categories";
import { BLOG_FEATURED_COUNT, BLOG_INDEX_COPY } from "@/lib/blog/index-copy";
import { getFeaturedPosts, getPostsByCategory } from "@/lib/blog/index";
import type { BlogPost } from "@/lib/blog/types";

type Props = {
  posts: BlogPost[];
};

/** Latest posts on the index; every post is also listed on its topic hub (/blog/topic/<slug>). */
export const BLOG_INDEX_LATEST = 36;

export function BlogIndexContent({ posts }: Props) {
  const featuredPosts = getFeaturedPosts(BLOG_FEATURED_COUNT);
  const featuredSlugs = new Set(featuredPosts.map((p) => p.slug));
  const latest = posts.filter((p) => !featuredSlugs.has(p.slug)).slice(0, BLOG_INDEX_LATEST);
  const { allPosts } = BLOG_INDEX_COPY;

  return (
    <section className="blog-index min-w-0" aria-labelledby="blog-index-list-heading">
      <div className="landing-wrap landing-wrap-tight min-w-0">
        <h2 id="blog-index-list-heading" className="sr-only">
          Articles
        </h2>
        <BlogTopicChips active="all" />
        <BlogIndexFeatured posts={featuredPosts} />
        <h2 id={allPosts.titleId} className="blog-index__section-label blog-index__section-label--spaced">
          Latest articles
        </h2>
        <ul className="blog-index__grid blog-index__grid--compact">
          {latest.map((post) => (
            <li key={post.slug}>
              <BlogPostCard post={post} compact />
            </li>
          ))}
        </ul>

        <h2 className="blog-index__section-label blog-index__section-label--spaced">Browse by topic</h2>
        <ul className="seo-links">
          {BLOG_CATEGORIES.map((cat) => {
            const n = getPostsByCategory(cat.slug).length;
            if (!n) return null;
            return (
              <li key={cat.slug}>
                <Link href={`/blog/topic/${cat.slug}`}>
                  {cat.label} ({n})<small>{BLOG_CATEGORY_BLURBS[cat.slug]}</small>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
