import { BlogFeaturedCard } from "@/components/blog/blog-featured-card";
import { BLOG_INDEX_COPY } from "@/lib/blog/index-copy";
import type { BlogPost } from "@/lib/blog/types";

type Props = {
  posts: BlogPost[];
};

export function BlogIndexFeatured({ posts }: Props) {
  const { titleId, label } = BLOG_INDEX_COPY.featured;

  if (!posts.length) return null;

  return (
    <section className="blog-index-featured" aria-labelledby={titleId}>
      <h2 id={titleId} className="blog-index-featured__label">
        {label}
      </h2>
      <ul className="blog-index-featured__grid">
        {posts.map((post) => (
          <li key={post.slug}>
            <BlogFeaturedCard post={post} compact />
          </li>
        ))}
      </ul>
    </section>
  );
}
