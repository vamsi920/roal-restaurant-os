import { JsonLd } from "@/components/seo/json-ld";
import { founderJsonLd, graph, organizationJsonLd, softwareJsonLd, websiteJsonLd } from "@/lib/seo/json-ld";

/** Organization, founder, WebSite and SoftwareApplication structured data for the home page. */
export function SiteJsonLd() {
  return <JsonLd data={graph(organizationJsonLd(), founderJsonLd(), websiteJsonLd(), softwareJsonLd())} />;
}
