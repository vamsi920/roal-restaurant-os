import { PRICING_RATE_AMOUNT } from "@/lib/landing/pricing-core";
import { getSiteOrigin } from "@/lib/site-url";

/** Canonical origin for structured data (production fallback so schema never points at localhost). */
export function siteOrigin(): string {
  return getSiteOrigin() ?? "https://tryroal.com";
}

export const ORG_ID = () => `${siteOrigin()}/#organization`;
export const WEBSITE_ID = () => `${siteOrigin()}/#website`;
export const FOUNDER_ID = () => `${siteOrigin()}/about#founder`;

export const FOUNDER = {
  name: "Venkata Vamsi",
  jobTitle: "Founder, ROAL",
  homeLocation: "Jersey City, NJ",
} as const;

export function organizationJsonLd() {
  const origin = siteOrigin();
  return {
    "@type": "Organization",
    "@id": ORG_ID(),
    name: "ROAL",
    alternateName: ["ROAL AI phone host", "ROAL AI", "tryroal", "tryroal.com"],
    disambiguatingDescription:
      "ROAL (tryroal.com) is restaurant software: an AI phone host built in Jersey City, NJ. It is not a restaurant or a food distributor.",
    sameAs: [
      "https://www.producthunt.com/products/roal",
      "https://www.indiehackers.com/product/roal",
      "https://news.ycombinator.com/item?id=50289318",
      "https://twelve.tools/tryroal",
    ],
    url: origin,
    logo: { "@type": "ImageObject", url: `${origin}/icons/roal-512.png`, width: 512, height: 512 },
    image: `${origin}/opengraph-image`,
    email: "vamsi@tryroal.com",
    description:
      "ROAL is an AI phone host for restaurants. It answers calls, takes pickup and delivery orders from the live menu, and sends tickets to the kitchen screen. $0.90 per completed order, no monthly fee.",
    foundingDate: "2026",
    founder: { "@id": FOUNDER_ID() },
    address: { "@type": "PostalAddress", addressLocality: "Jersey City", addressRegion: "NJ", addressCountry: "US" },
    areaServed: { "@type": "Country", name: "United States" },
    knowsAbout: [
      "AI phone answering for restaurants",
      "Restaurant phone orders",
      "Pickup and delivery ordering",
      "Kitchen display systems",
      "Call forwarding",
    ],
    contactPoint: { "@type": "ContactPoint", email: "vamsi@tryroal.com", contactType: "sales", areaServed: "US", availableLanguage: ["English"] },
  };
}

export function founderJsonLd() {
  return {
    "@type": "Person",
    "@id": FOUNDER_ID(),
    name: FOUNDER.name,
    jobTitle: FOUNDER.jobTitle,
    url: `${siteOrigin()}/about#founder`,
    worksFor: { "@id": ORG_ID() },
    homeLocation: { "@type": "Place", name: FOUNDER.homeLocation },
  };
}

export function websiteJsonLd() {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID(),
    url: siteOrigin(),
    name: "ROAL",
    alternateName: ["ROAL AI phone host", "tryroal.com"],
    description: "AI phone host for restaurants: answers calls and takes pickup orders from your live menu.",
    publisher: { "@id": ORG_ID() },
    inLanguage: "en-US",
  };
}

export function softwareJsonLd() {
  const origin = siteOrigin();
  const price = PRICING_RATE_AMOUNT.replace(/[^0-9.]/g, "");
  return {
    "@type": "SoftwareApplication",
    "@id": `${origin}/#software`,
    name: "ROAL",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "AI phone answering for restaurants",
    operatingSystem: "Web",
    url: origin,
    publisher: { "@id": ORG_ID() },
    description:
      "AI phone host for restaurants: answers calls, takes pickup and delivery orders from the live menu, answers menu and hours questions, and sends tickets to the kitchen screen.",
    featureList: [
      "Answers restaurant calls, including several at once",
      "Takes pickup and delivery orders from the live menu",
      "Sends order tickets to a kitchen screen",
      "Answers hours, address, parking and menu questions",
      "Speaks the caller's language",
      "Hands catering, complaints and manager requests to staff",
      "Builds itself from the restaurant's website or Google Maps link in about two minutes",
    ],
    offers: {
      "@type": "Offer",
      priceCurrency: "USD",
      price,
      description: "Per completed phone order. No monthly fee, no setup fee, no contract.",
      priceSpecification: { "@type": "UnitPriceSpecification", price, priceCurrency: "USD", unitText: "completed phone order" },
    },
  };
}

export type Crumb = { name: string; path: string };

export function breadcrumbJsonLd(crumbs: Crumb[]) {
  const origin = siteOrigin();
  return {
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: `${origin}${c.path === "/" ? "" : c.path}`,
    })),
  };
}

export function faqJsonLd(items: { question: string; answer: string }[], path?: string) {
  return {
    "@type": "FAQPage",
    ...(path ? { "@id": `${siteOrigin()}${path}#faq` } : {}),
    mainEntity: items.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

export function webPageJsonLd(input: { path: string; name: string; description: string; type?: string }) {
  const url = `${siteOrigin()}${input.path}`;
  return {
    "@type": input.type ?? "WebPage",
    "@id": `${url}#webpage`,
    url,
    name: input.name,
    description: input.description,
    isPartOf: { "@id": WEBSITE_ID() },
    publisher: { "@id": ORG_ID() },
    inLanguage: "en-US",
  };
}

export function graph(...nodes: Record<string, unknown>[]) {
  return { "@context": "https://schema.org", "@graph": nodes };
}
