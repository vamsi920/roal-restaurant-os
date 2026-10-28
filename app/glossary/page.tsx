import Link from "next/link";
import { ClosingCta } from "@/components/landing/home/closing-cta";
import { PageHero } from "@/components/landing/page-hero";
import { SiteShell } from "@/components/landing/site-shell";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbJsonLd, graph, siteOrigin, webPageJsonLd } from "@/lib/seo/json-ld";
import { getGlossary } from "@/lib/seo/landing";
import { buildPublicPageMetadata } from "@/lib/seo/public-open-graph";

export const metadata = buildPublicPageMetadata({
  title: "Restaurant phone ordering glossary: 45 terms | ROAL",
  description:
    "Plain-English definitions of restaurant phone and ordering terms: call forwarding, KDS, 86, modifiers, read-back, ticket time, delivery commission and more.",
  canonicalPath: "/glossary",
});

export default function GlossaryPage() {
  const terms = getGlossary();
  const origin = siteOrigin();
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Glossary", path: "/glossary" },
  ];
  return (
    <SiteShell>
      <JsonLd
        data={graph(
          webPageJsonLd({ path: "/glossary", name: "Restaurant phone ordering glossary", description: "Definitions of restaurant phone and ordering terms.", type: "CollectionPage" }),
          breadcrumbJsonLd(crumbs),
          {
            "@type": "DefinedTermSet",
            "@id": `${origin}/glossary#terms`,
            name: "Restaurant phone ordering glossary",
            url: `${origin}/glossary`,
            hasDefinedTerm: terms.map((t) => ({
              "@type": "DefinedTerm",
              name: t.term,
              description: t.short,
              url: `${origin}/glossary/${t.slug}`,
            })),
          }
        )}
      />
      <div className="wrap pt-6">
        <Breadcrumbs crumbs={crumbs} />
      </div>
      <PageHero
        eyebrow="Glossary"
        title="Restaurant phone ordering, in plain words"
        lead="The words owners, staff and phone vendors use, from call forwarding to the pass. One sentence each, with a longer explanation one click away."
      />
      <section className="section !pt-4">
        <div className="wrap">
          <dl className="seo-grid">
            {terms.map((t) => (
              <div key={t.slug} className="seo-card">
                <dt>
                  <h2 className="m-0 text-[1.0625rem] font-semibold">
                    <Link href={`/glossary/${t.slug}`}>{t.term}</Link>
                  </h2>
                </dt>
                <dd className="m-0 mt-2 text-[0.9688rem] leading-relaxed opacity-80">{t.short}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
      <ClosingCta />
    </SiteShell>
  );
}
