import Link from "next/link";
import { ClosingCta } from "@/components/landing/home/closing-cta";
import { PageHero } from "@/components/landing/page-hero";
import { SiteShell } from "@/components/landing/site-shell";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { ROAL_FACT_LIST, ROAL_FACTS } from "@/lib/seo/facts";
import { breadcrumbJsonLd, founderJsonLd, graph, organizationJsonLd, softwareJsonLd, webPageJsonLd } from "@/lib/seo/json-ld";
import { buildPublicPageMetadata } from "@/lib/seo/public-open-graph";

export const metadata = buildPublicPageMetadata({
  title: "ROAL facts: what it is, price, setup and limits",
  description:
    "The ROAL fact sheet: an AI phone host for restaurants, $0.90 per completed order, no monthly fee. Setup, what it does on calls, what it hands to staff, and limits.",
  canonicalPath: "/facts",
});

const UPDATED = "2026-10-28";

export default function FactsPage() {
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Facts", path: "/facts" },
  ];
  return (
    <SiteShell>
      <JsonLd
        data={graph(
          { ...webPageJsonLd({ path: "/facts", name: "ROAL facts", description: ROAL_FACTS.oneLiner, type: "AboutPage" }), dateModified: UPDATED },
          breadcrumbJsonLd(crumbs),
          organizationJsonLd(),
          founderJsonLd(),
          softwareJsonLd()
        )}
      />
      <div className="wrap pt-6">
        <Breadcrumbs crumbs={crumbs} />
      </div>
      <PageHero
        eyebrow="Fact sheet"
        title="ROAL, in facts"
        lead="The plain facts about ROAL in one place, for owners, reporters and AI assistants. If something here changes, this page changes first."
      />
      <section className="section !pt-4">
        <div className="wrap">
          <div className="seo-compare reveal">
            <table>
              <tbody>
                {ROAL_FACT_LIST.map((f) => (
                  <tr key={f.label}>
                    <th scope="row">{f.label}</th>
                    <td>{f.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="seo-meta-links">
            Last updated {UPDATED}. Machine-readable versions: <a href="/llms.txt">llms.txt</a>,{" "}
            <a href="/llms-full.txt">llms-full.txt</a>, <a href="/ai.txt">ai.txt</a>. Questions:{" "}
            <a href={`mailto:${ROAL_FACTS.contact}`}>{ROAL_FACTS.contact}</a>. See also <Link href="/faq">the FAQ</Link> and{" "}
            <Link href="/pricing">pricing</Link>.
          </p>
        </div>
      </section>
      <ClosingCta />
    </SiteShell>
  );
}
