import { PRICING_RATE_AMOUNT } from "@/lib/landing/pricing-core";
import { getSiteOrigin } from "@/lib/site-url";

/** Organization + SoftwareApplication structured data for the home page. */
export function SiteJsonLd() {
  const origin = getSiteOrigin() ?? "https://roal-os.netlify.app";
  const price = PRICING_RATE_AMOUNT.replace(/[^0-9.]/g, "");
  const data = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "ROAL",
      url: origin,
      logo: `${origin}/icons/roal-apple-touch-icon.png`,
      email: "hello@getroal.com",
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "ROAL",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: origin,
      description:
        "AI phone host for restaurants: answers calls, takes pickup and delivery orders from the live menu, and sends tickets to the kitchen.",
      offers: {
        "@type": "Offer",
        priceCurrency: "USD",
        price,
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price,
          priceCurrency: "USD",
          unitText: "completed phone order",
        },
      },
    },
  ];
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}
