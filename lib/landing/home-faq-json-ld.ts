import { HOME_FAQ, type LaunchFaqItem } from "@/lib/landing/launch-faq";
import { absoluteUrl, getSiteOrigin } from "@/lib/site-url";

function faqAnswerText(item: LaunchFaqItem): string {
  if (!item.link) return item.answer;
  const url = absoluteUrl(item.link.href) ?? item.link.href;
  return `${item.answer} ${item.link.label}: ${url}.`;
}

/** Static FAQPage graph for homepage `/#faq`. */
export function buildHomeFaqPageJsonLd() {
  const origin = getSiteOrigin() ?? "http://localhost:3000";
  const pageUrl = `${origin}/`;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${pageUrl}#faq`,
    url: pageUrl,
    mainEntity: HOME_FAQ.items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faqAnswerText(item),
      },
    })),
  };
}
