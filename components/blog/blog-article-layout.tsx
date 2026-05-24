import type { ReactNode } from "react";
import Link from "next/link";
import { BlogArticleAeoAnswer } from "@/components/blog/blog-article-aeo-answer";
import { BlogArticleJsonLd } from "@/components/blog/blog-article-json-ld";
import { BlogArticleCta } from "@/components/blog/blog-article-cta";
import { BlogArticleFaq } from "@/components/blog/blog-article-faq";
import { BlogArticleHeader } from "@/components/blog/blog-article-header";
import { BlogArticleSections } from "@/components/blog/blog-article-sections";
import { BlogRelatedPosts } from "@/components/blog/blog-related-posts";
import { MarketingShell } from "@/components/landing/marketing-shell";
import { BLOG_CTA_DEMO } from "@/lib/blog/cta";
import type { BlogPost } from "@/lib/blog/types";

type Props = {
  post: BlogPost;
  related: BlogPost[];
};

function ArticleShell({
  children,
  jsonLd,
}: {
  children: ReactNode;
  jsonLd?: ReactNode;
}) {
  return (
    <MarketingShell>
      {jsonLd}
      <article className="blog-article blog-article--glass">{children}</article>
    </MarketingShell>
  );
}

export function BlogArticleLayout({ post, related }: Props) {
  const content = post.content;

  if (!content) {
    return (
      <ArticleShell>
        <div className="blog-article__hero-band">
          <div className="blog-article__hero-wash" aria-hidden />
          <div className="landing-wrap landing-wrap-tight blog-article__wrap">
            <BlogArticleHeader post={post} />
          </div>
        </div>
        <div className="landing-wrap landing-wrap-tight blog-article__stack">
          <p className="blog-article__stub" role="status">
            Full article coming soon. Browse the{" "}
            <Link href="/blog" className="public-blog-link">
              journal
            </Link>{" "}
            for more guides.
          </p>
          <BlogArticleCta cta={BLOG_CTA_DEMO} categorySlug={post.primaryCategorySlug} />
          <BlogRelatedPosts posts={related} currentSlug={post.slug} />
        </div>
      </ArticleShell>
    );
  }

  return (
    <ArticleShell jsonLd={<BlogArticleJsonLd post={post} />}>
      <div className="blog-article__hero-band">
        <div className="blog-article__hero-wash" aria-hidden />
        <div className="landing-wrap landing-wrap-tight blog-article__wrap">
          <BlogArticleHeader post={post} />
          <BlogArticleAeoAnswer content={content} fallbackQuestion={post.title} />
        </div>
      </div>

      <div className="landing-wrap landing-wrap-tight blog-article__stack">
        <div className="blog-article__content">
          <BlogArticleSections sections={content.sections} />
        </div>
        <BlogArticleFaq items={content.faq} />
        <BlogArticleCta cta={content.cta} categorySlug={post.primaryCategorySlug} />
        <BlogRelatedPosts posts={related} currentSlug={post.slug} />
      </div>
    </ArticleShell>
  );
}
