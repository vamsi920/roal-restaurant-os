import Link from "next/link";
import { BlogPostMeta } from "@/components/blog/blog-post-meta";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { getCategoryLabel } from "@/lib/blog/categories";
import { BLOG_AUTHOR } from "@/lib/blog/generated";
import type { BlogPost } from "@/lib/blog/types";

type Props = {
  post: BlogPost;
};

export function BlogArticleHeader({ post }: Props) {
  const summary = post.content?.summary ?? post.excerpt;
  const author = post.content?.author ?? "ROAL Team";

  return (
    <header className="blog-article-header">
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Blog", path: "/blog" },
          { name: getCategoryLabel(post.primaryCategorySlug), path: `/blog/topic/${post.primaryCategorySlug}` },
        ]}
        className="blog-article-header__back"
      />
      <BlogPostMeta
        className="blog-article-header__meta"
        categorySlug={post.primaryCategorySlug}
        readTimeMinutes={post.readTimeMinutes}
        publishedAt={post.publishedAt}
      />
      <h1 className="blog-article-header__title">{post.title}</h1>
      <p className="blog-article-header__summary">{summary}</p>
      <p className="blog-article-header__byline">
        By{" "}
        {author === BLOG_AUTHOR ? (
          <Link href="/about#founder" rel="author">
            {author}
          </Link>
        ) : (
          author
        )}
        {author === BLOG_AUTHOR ? ", founder of ROAL · Jersey City, NJ" : null}
      </p>
    </header>
  );
}
