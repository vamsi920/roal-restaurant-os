import { buildPricingPageJsonLd } from "@/lib/landing/pricing-faq-json-ld";

export function PricingFaqJsonLd() {
  const graph = buildPricingPageJsonLd();

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
