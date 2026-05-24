import { buildSecurityFaqPageJsonLd } from "@/lib/landing/security-faq-json-ld";

export function SecurityFaqJsonLd() {
  const graph = buildSecurityFaqPageJsonLd();

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
