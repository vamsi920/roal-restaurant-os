import { BlogPostCard } from "@/components/blog/blog-post-card";
import { BLOG_RELATED_POST_LIMIT } from "@/lib/blog";
import type { BlogPost } from "@/lib/blog/types";

type Props = {
  posts: BlogPost[];
  currentSlug?: string;
};

export function BlogRelatedPosts({ posts, currentSlug }: Props) {
  const related = posts
    .filter((p) => p.slug !== currentSlug && p.content)
    .slice(0, BLOG_RELATED_POST_LIMIT);

  if (related.length === 0) return null;

  return (
    <section className="blog-related" aria-labelledby="blog-related-heading">
      <h2 id="blog-related-heading" className="blog-related__title">
        Related articles
      </h2>
      <ul className="blog-related__grid">
        {related.map((post) => (
          <li key={post.slug}>
            <BlogPostCard post={post} compact />
          </li>
        ))}
      </ul>
    </section>
  );
}
