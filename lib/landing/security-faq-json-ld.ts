import {
  SECURITY_FAQ,
  SECURITY_PAGE_COPY,
  type SecurityFaqItem,
} from "@/lib/landing/security-page-copy";
import { getSiteOrigin } from "@/lib/site-url";

function faqAnswerText(item: SecurityFaqItem, pageUrl: string, origin: string): string {
  if (!item.link) return item.answer;
  const href = item.link.href.startsWith("#")
    ? `${pageUrl}${item.link.href}`
    : `${origin}${item.link.href}`;
  return `${item.answer} ${item.link.label}: ${href}`;
}

/** Static FAQPage graph for `/security` (AEO lead + security FAQ). */
export function buildSecurityFaqPageJsonLd() {
  const origin = getSiteOrigin() ?? "http://localhost:3000";
  const pageUrl = `${origin}/security`;
  const { aeo } = SECURITY_PAGE_COPY;

  const mainEntity = [
    {
      "@type": "Question",
      name: aeo.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: aeo.answer,
      },
    },
    ...SECURITY_FAQ.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faqAnswerText(item, pageUrl, origin),
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
