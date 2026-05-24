import { buildBlogIndexAeoJsonLd } from "@/lib/blog/index-aeo-json-ld";

export function BlogIndexAeoJsonLd() {
  const graph = buildBlogIndexAeoJsonLd();

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
