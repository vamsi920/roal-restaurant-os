import { getAllPosts } from "@/lib/blog";
import { blogPublishedInstant } from "@/lib/blog/dates";
import { siteOrigin } from "@/lib/seo/json-ld";

export const revalidate = 3600;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** RSS 2.0 feed of published posts. */
export function GET() {
  const o = siteOrigin();
  const posts = getAllPosts().slice(0, 50);
  const items = posts
    .map(
      (p) => `    <item>
      <title>${esc(p.title)}</title>
      <link>${o}/blog/${p.slug}</link>
      <guid isPermaLink="true">${o}/blog/${p.slug}</guid>
      <pubDate>${new Date(blogPublishedInstant(p.publishedAt)).toUTCString()}</pubDate>
      <description>${esc(p.content?.seo.description ?? p.excerpt)}</description>
    </item>`
    )
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>The ROAL Journal</title>
    <link>${o}/blog</link>
    <atom:link href="${o}/blog/feed.xml" rel="self" type="application/rss+xml" />
    <description>Guides for restaurant owners on phone orders, missed calls and AI phone answering.</description>
    <language>en-us</language>
${items}
  </channel>
</rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
