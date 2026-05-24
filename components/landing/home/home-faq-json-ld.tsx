import { buildHomeFaqPageJsonLd } from "@/lib/landing/home-faq-json-ld";

export function HomeFaqJsonLd() {
  const graph = buildHomeFaqPageJsonLd();

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
