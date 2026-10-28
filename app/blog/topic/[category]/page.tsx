import { notFound } from "next/navigation";
import { BlogPostCard } from "@/components/blog/blog-post-card";
import { BlogTopicChips } from "@/components/blog/blog-topic-chips";
import { MarketingShell } from "@/components/landing/marketing-shell";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { BLOG_CATEGORIES, BLOG_CATEGORY_BLURBS, BLOG_CATEGORY_SLUGS, type BlogCategorySlug } from "@/lib/blog/categories";
import { getPostsByCategory } from "@/lib/blog";
import { breadcrumbJsonLd, graph, siteOrigin, webPageJsonLd } from "@/lib/seo/json-ld";
import { buildPublicPageMetadata } from "@/lib/seo/public-open-graph";

export const revalidate = 3600;

type Props = { params: Promise<{ category: string }> };

const isCategory = (s: string): s is BlogCategorySlug => (BLOG_CATEGORY_SLUGS as readonly string[]).includes(s);

export function generateStaticParams() {
  return BLOG_CATEGORIES.map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { category } = await params;
  if (!isCategory(category)) return {};
  const label = BLOG_CATEGORIES.find((c) => c.slug === category)!.label;
  return buildPublicPageMetadata({
    title: `${label}: guides for restaurant owners | ROAL`,
    description: `${BLOG_CATEGORY_BLURBS[category]} ${getPostsByCategory(category).length} practical guides from the ROAL Journal.`.slice(0, 160),
    canonicalPath: `/blog/topic/${category}`,
  });
}

export default async function BlogTopicPage({ params }: Props) {
  const { category } = await params;
  if (!isCategory(category)) notFound();
  const label = BLOG_CATEGORIES.find((c) => c.slug === category)!.label;
  const posts = getPostsByCategory(category);
  const path = `/blog/topic/${category}`;
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Blog", path: "/blog" },
    { name: label, path },
  ];
  const origin = siteOrigin();

  return (
    <MarketingShell>
      <JsonLd
        data={graph(
          webPageJsonLd({ path, name: `${label} guides`, description: BLOG_CATEGORY_BLURBS[category], type: "CollectionPage" }),
          breadcrumbJsonLd(crumbs),
          {
            "@type": "ItemList",
            itemListElement: posts.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: `${origin}/blog/${p.slug}`, name: p.title })),
          }
        )}
      />
      <div className="blog-shell min-w-0 overflow-x-clip">
        <header className="blog-index-hero">
          <div className="blog-index-hero__wash" aria-hidden />
          <div className="landing-wrap landing-wrap-tight blog-index-hero__inner">
            <Breadcrumbs crumbs={crumbs} />
            <h1 className="blog-index-hero__title mt-4">{label}</h1>
            <p className="blog-index-hero__deck">{BLOG_CATEGORY_BLURBS[category]}</p>
          </div>
        </header>
        <section className="blog-index min-w-0">
          <div className="landing-wrap landing-wrap-tight min-w-0">
            <BlogTopicChips active={category} />
            <h2 className="blog-index__section-label blog-index__section-label--spaced">
              {posts.length} {posts.length === 1 ? "article" : "articles"}
            </h2>
            <ul className="blog-index__grid blog-index__grid--compact">
              {posts.map((post) => (
                <li key={post.slug}>
                  <BlogPostCard post={post} compact />
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </MarketingShell>
  );
}
