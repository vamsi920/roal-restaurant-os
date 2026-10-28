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
import { Markdown } from "@/components/seo/markdown";
import { BLOG_CTA_DEMO } from "@/lib/blog/cta";
import { formatPostDate, getPostsByCategory } from "@/lib/blog";
import { getCategoryLabel } from "@/lib/blog/categories";
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
      <article className="blog-article blog-article--glass min-w-0 overflow-x-clip">
        {children}
      </article>
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
        <div className="blog-article__reading">
          <div className="blog-article__content">
            {content.intro ? <Markdown text={content.intro} className="seo-md seo-intro" /> : null}
            {content.takeaways?.length ? (
              <section className="seo-takeaways" aria-labelledby="takeaways-heading">
                <h2 id="takeaways-heading">Key takeaways</h2>
                <ul>
                  {content.takeaways.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </section>
            ) : null}
            {content.sections.length > 3 ? (
              <details className="seo-toc">
                <summary>In this post</summary>
                <ol>
                  {content.sections.map((s) => (
                    <li key={s.id}>
                      <a href={`#${s.id}`}>{s.title}</a>
                    </li>
                  ))}
                  {content.faq.length ? (
                    <li>
                      <a href="#faq">Questions owners ask</a>
                    </li>
                  ) : null}
                </ol>
              </details>
            ) : null}
            <BlogArticleSections sections={content.sections} />
          </div>
          <BlogArticleFaq items={content.faq} />
          <aside className="seo-author" aria-label="About the author">
            <span className="seo-author__avatar" aria-hidden>
              V
            </span>
            <p className="m-0">
              <strong>{content.author}</strong> builds ROAL, an AI phone host for restaurants, from Jersey City, NJ.
              He writes about phone orders, rush-hour operations and what actually helps small restaurants.{" "}
              <Link href="/about#founder">More about ROAL</Link>
            </p>
          </aside>
          <p className="seo-meta-links">
            Published {formatPostDate(post.publishedAt)} ·{" "}
            <a href={`/blog/${post.slug}.md`} rel="alternate" type="text/markdown">
              Read as plain text (markdown)
            </a>
          </p>
        </div>
        <BlogArticleCta cta={content.cta} categorySlug={post.primaryCategorySlug} />
        <BlogRelatedPosts posts={related} currentSlug={post.slug} />
        <MoreInCategory post={post} exclude={related.map((p) => p.slug)} />
      </div>
    </ArticleShell>
  );
}

/** The next posts in this category (wrapping around), so every post gets links from its neighbors. */
function MoreInCategory({ post, exclude }: { post: BlogPost; exclude: string[] }) {
  const list = getPostsByCategory(post.primaryCategorySlug);
  const i = list.findIndex((p) => p.slug === post.slug);
  const skip = new Set([post.slug, ...exclude]);
  const next = [...list.slice(i + 1), ...list.slice(0, Math.max(0, i))].filter((p) => !skip.has(p.slug)).slice(0, 8);
  if (!next.length) return null;
  const label = getCategoryLabel(post.primaryCategorySlug);
  return (
    <section className="mt-10" aria-labelledby="more-in-category">
      <h2 id="more-in-category" className="blog-related__title">
        More in {label}
      </h2>
      <ul className="seo-links mt-4">
        {next.map((p) => (
          <li key={p.slug}>
            <Link href={`/blog/${p.slug}`}>{p.title}</Link>
          </li>
        ))}
      </ul>
      <p className="seo-meta-links">
        <Link href={`/blog/topic/${post.primaryCategorySlug}`}>All {label.toLowerCase()} guides</Link> ·{" "}
        <Link href="/tools">Free tools</Link> · <Link href="/glossary">Glossary</Link>
      </p>
    </section>
  );
}
