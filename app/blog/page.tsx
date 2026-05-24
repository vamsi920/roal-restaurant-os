import { Suspense } from "react";
import { BlogIndexAeoJsonLd } from "@/components/blog/blog-index-aeo-json-ld";
import { BlogIndexContent } from "@/components/blog/blog-index-content";
import { BlogIndexHero } from "@/components/blog/blog-index-hero";
import { MarketingShell } from "@/components/landing/marketing-shell";
import { getAllPosts } from "@/lib/blog";

export { buildBlogIndexMetadata as metadata } from "@/lib/blog/metadata";

function BlogIndexFallback() {
  return (
    <section className="blog-index" aria-busy="true">
      <div className="landing-wrap landing-wrap-tight">
        <p className="blog-index__empty">Loading articles…</p>
      </div>
    </section>
  );
}

export default function BlogIndexPage() {
  const posts = getAllPosts();

  return (
    <MarketingShell>
      <BlogIndexAeoJsonLd />
      <div className="blog-shell min-w-0">
        <BlogIndexHero />
        <Suspense fallback={<BlogIndexFallback />}>
          <BlogIndexContent posts={posts} />
        </Suspense>
      </div>
    </MarketingShell>
  );
}
