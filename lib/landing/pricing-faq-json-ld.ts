import { PRICING_FAQ, PRICING_PAGE_COPY } from "@/lib/landing/pricing-page-copy";
import { getSiteOrigin } from "@/lib/site-url";

/** Static FAQPage graph for `/pricing` (cost Q + pricing FAQ). */
export function buildPricingPageJsonLd() {
  const origin = getSiteOrigin() ?? "http://localhost:3000";
  const pageUrl = `${origin}/pricing`;
  const { aeo } = PRICING_PAGE_COPY;

  const mainEntity = [
    {
      "@type": "Question",
      name: aeo.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: `${aeo.answer} ${aeo.detail}`,
      },
    },
    ...PRICING_FAQ.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  ];

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${pageUrl}#faq`,
    url: pageUrl,
    mainEntity,
  };
}
