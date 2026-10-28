import { getAllPosts } from "@/lib/blog/index";
import { BLOG_INDEX_COPY } from "@/lib/blog/index-copy";
import { breadcrumbJsonLd, graph, ORG_ID, siteOrigin } from "@/lib/seo/json-ld";

/** Blog + latest-posts ItemList + breadcrumbs for `/blog`. */
export function buildBlogIndexAeoJsonLd() {
  const origin = siteOrigin();
  const pageUrl = `${origin}/blog`;
  const posts = getAllPosts().slice(0, 30);
  return graph(
    {
      "@type": "Blog",
      "@id": `${pageUrl}#blog`,
      url: pageUrl,
      name: BLOG_INDEX_COPY.hero.title,
      description: BLOG_INDEX_COPY.hero.description,
      publisher: { "@id": ORG_ID() },
      inLanguage: "en-US",
    },
    {
      "@type": "ItemList",
      itemListElement: posts.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: `${origin}/blog/${p.slug}`, name: p.title })),
    },
    breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Blog", path: "/blog" },
    ])
  );
}
