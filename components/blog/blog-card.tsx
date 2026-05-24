import Link from "next/link";
import { BlogPostMeta } from "@/components/blog/blog-post-meta";
import { getBlogPostHref } from "@/lib/blog/href";
import type { BlogPost } from "@/lib/blog/types";
import { cn } from "@/lib/cn";

export type BlogCardTone = "default" | "featured";

type Props = {
  post: BlogPost;
  tone?: BlogCardTone;
  /** Smaller type in related-post grids. */
  compact?: boolean;
};

export function BlogCard({ post, tone = "default", compact = false }: Props) {
  const href = getBlogPostHref(post.slug);
  const featured = tone === "featured";

  return (
    <article
      className={cn(
        "blog-card",
        featured && "blog-card--featured",
        compact && "blog-card--compact"
      )}
    >
      <Link
        href={href}
        className="blog-card__link"
        aria-label={`Read article: ${post.title}`}
      >
        <div className="blog-card__surface">
          {featured ? <p className="blog-card__eyebrow">Featured</p> : null}
          <BlogPostMeta
            className="blog-card__meta"
            categorySlug={post.primaryCategorySlug}
            readTimeMinutes={post.readTimeMinutes}
            publishedAt={post.publishedAt}
          />
          <h2 className="blog-card__title">{post.title}</h2>
          <p className="blog-card__excerpt">{post.excerpt}</p>
          <span className="blog-card__cta">
            {featured ? "Read article" : "Read"}
            <span className="blog-card__cta-icon" aria-hidden>
              →
            </span>
          </span>
        </div>
      </Link>
    </article>
  );
}
