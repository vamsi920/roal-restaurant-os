import Link from "next/link";
import { BlogPostMeta } from "@/components/blog/blog-post-meta";
import type { BlogPost } from "@/lib/blog/types";

type Props = {
  post: BlogPost;
};

export function BlogArticleHeader({ post }: Props) {
  const summary = post.content?.summary ?? post.excerpt;
  const author = post.content?.author ?? "ROAL Team";

  return (
    <header className="blog-article-header">
      <Link href="/blog" className="blog-article-header__back">
        ← Journal
      </Link>
      <BlogPostMeta
        className="blog-article-header__meta"
        categorySlug={post.primaryCategorySlug}
        readTimeMinutes={post.readTimeMinutes}
        publishedAt={post.publishedAt}
      />
      <h1 className="blog-article-header__title">{post.title}</h1>
      <p className="blog-article-header__summary">{summary}</p>
      <p className="blog-article-header__byline">By {author}</p>
    </header>
  );
}
