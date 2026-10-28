import Link from "next/link";
import { notFound } from "next/navigation";
import { ClosingCta } from "@/components/landing/home/closing-cta";
import { LaunchAeoAnswer } from "@/components/landing/launch-aeo-answer";
import { PageHero } from "@/components/landing/page-hero";
import { SiteShell } from "@/components/landing/site-shell";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { Markdown } from "@/components/seo/markdown";
import { getAllPosts } from "@/lib/blog";
import { breadcrumbJsonLd, graph, siteOrigin, webPageJsonLd } from "@/lib/seo/json-ld";
import { getGlossary, getGlossaryEntry } from "@/lib/seo/landing";
import { buildPublicPageMetadata } from "@/lib/seo/public-open-graph";

export const dynamicParams = false;

type Props = { params: { slug: string } };

export function generateStaticParams() {
  return getGlossary().map((t) => ({ slug: t.slug }));
}

export function generateMetadata({ params }: Props) {
  const t = getGlossaryEntry(params.slug);
  if (!t) return {};
  return buildPublicPageMetadata({
    title: `What is ${t.term}? Restaurant glossary | ROAL`,
    description: t.short.length > 150 ? `${t.short.slice(0, 147)}...` : `${t.short} Plain-English restaurant glossary.`.slice(0, 160),
    canonicalPath: `/glossary/${t.slug}`,
  });
}

export default function GlossaryTermPage({ params }: Props) {
  const t = getGlossaryEntry(params.slug);
  if (!t) notFound();
  const all = getGlossary();
  const i = all.findIndex((x) => x.slug === t.slug);
  const nearby = [...all.slice(i + 1), ...all.slice(0, i)].slice(0, 8);
  const keyWords = t.term.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3);
  const posts = getAllPosts()
    .filter((p) => keyWords.some((w) => `${p.title} ${p.content?.keyword ?? ""}`.toLowerCase().includes(w)))
    .slice(0, 4);
  const path = `/glossary/${t.slug}`;
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Glossary", path: "/glossary" },
    { name: t.term, path },
  ];
  const origin = siteOrigin();
  return (
    <SiteShell>
      <JsonLd
        data={graph(
          webPageJsonLd({ path, name: `What is ${t.term}?`, description: t.short }),
          breadcrumbJsonLd(crumbs),
          {
            "@type": "DefinedTerm",
            "@id": `${origin}${path}#term`,
            name: t.term,
            description: t.short,
            url: `${origin}${path}`,
            inDefinedTermSet: `${origin}/glossary#terms`,
          }
        )}
      />
      <div className="wrap pt-6">
        <Breadcrumbs crumbs={crumbs} />
      </div>
      <PageHero eyebrow="Glossary" title={t.term} />
      <section className="section !pt-4">
        <div className="wrap">
          <div className="prose-card seo-prose reveal">
            <LaunchAeoAnswer titleId="term-answer" question={`What is ${t.term}?`} answer={t.short} />
            <Markdown text={t.body} className="seo-md mt-6" />
          </div>
        </div>
      </section>
      <section className="section">
        <div className="wrap">
          {posts.length ? (
            <>
              <h2 className="h3">Related guides</h2>
              <ul className="seo-links mt-4">
                {posts.map((p) => (
                  <li key={p.slug}>
                    <Link href={`/blog/${p.slug}`}>{p.title}</Link>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          <h2 className="h3 mt-10">More terms</h2>
          <ul className="seo-links mt-4">
            {nearby.map((x) => (
              <li key={x.slug}>
                <Link href={`/glossary/${x.slug}`}>{x.term}</Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <ClosingCta />
    </SiteShell>
  );
}
