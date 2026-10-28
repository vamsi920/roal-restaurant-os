import { BlogIndexAeoJsonLd } from "@/components/blog/blog-index-aeo-json-ld";
import { BlogIndexContent } from "@/components/blog/blog-index-content";
import { BlogIndexHero } from "@/components/blog/blog-index-hero";
import { MarketingShell } from "@/components/landing/marketing-shell";
import { getAllPosts } from "@/lib/blog";

export { buildBlogIndexMetadata as metadata } from "@/lib/blog/metadata";

// Scheduled posts appear on their publish day (see lib/blog/publish.ts).
export const revalidate = 3600;

export default function BlogIndexPage() {
  const posts = getAllPosts();

  return (
    <MarketingShell>
      <BlogIndexAeoJsonLd />
      <div className="blog-shell min-w-0 overflow-x-clip">
        <BlogIndexHero />
        <BlogIndexContent posts={posts} />
      </div>
    </MarketingShell>
  );
}
