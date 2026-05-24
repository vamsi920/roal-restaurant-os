import { BLOG_INDEX_COPY } from "@/lib/blog/index-copy";
import { getSiteOrigin } from "@/lib/site-url";

/** FAQPage graph for `/blog` index AEO block. */
export function buildBlogIndexAeoJsonLd() {
  const origin = getSiteOrigin() ?? "http://localhost:3000";
  const pageUrl = `${origin}/blog`;
  const { aeo } = BLOG_INDEX_COPY;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${pageUrl}#aeo`,
    url: pageUrl,
    mainEntity: [
      {
        "@type": "Question",
        name: aeo.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: `${aeo.answer} ${aeo.detail}`,
        },
      },
    ],
  };
}
