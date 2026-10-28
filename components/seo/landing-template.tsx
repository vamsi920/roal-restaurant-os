import Link from "next/link";
import { ClosingCta } from "@/components/landing/home/closing-cta";
import { FaqList } from "@/components/landing/faq-list";
import { LaunchAeoAnswer } from "@/components/landing/launch-aeo-answer";
import { PageHero } from "@/components/landing/page-hero";
import { SiteShell } from "@/components/landing/site-shell";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { Markdown } from "@/components/seo/markdown";
import { getAllPosts } from "@/lib/blog";
import type { BlogPost } from "@/lib/blog/types";
import { breadcrumbJsonLd, faqJsonLd, graph, ORG_ID, siteOrigin, webPageJsonLd, type Crumb } from "@/lib/seo/json-ld";
import { LANDING_FAMILIES, type LandingFamily } from "@/lib/seo/landing";
import type { LandingPageJson } from "@/lib/seo/landing-types";
import { mdPlain } from "@/lib/seo/md-plain";

const words = (s: string) => new Set(s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3));

/** Up to `n` published posts whose title or keyword shares words with this page. */
function relatedPosts(page: LandingPageJson, n = 6): BlogPost[] {
  const mine = words(`${page.label} ${page.h1} ${page.slug.replace(/-/g, " ")}`);
  return getAllPosts()
    .map((p) => {
      let score = 0;
      for (const w of words(`${p.title} ${p.content?.keyword ?? ""}`)) if (mine.has(w)) score++;
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map((x) => x.p);
}

export function LandingTemplate({ family, page }: { family: LandingFamily; page: LandingPageJson }) {
  const fam = LANDING_FAMILIES[family];
  const path = `/${family}/${page.slug}`;
  const crumbs: Crumb[] = [
    { name: "Home", path: "/" },
    { name: fam.crumb, path: `/${family}` },
    { name: page.label, path },
  ];
  const faq = page.faq.map((f, i) => ({ id: `${page.slug}-faq-${i}`, question: f.q, answer: mdPlain(f.a), pages: [] as never[] }));
  const siblings = fam.refs.filter((r) => r.slug !== page.slug);
  const posts = relatedPosts(page);

  const serviceNode = {
    "@type": "Service",
    "@id": `${siteOrigin()}${path}#service`,
    name: page.h1,
    serviceType: "AI phone answering for restaurants",
    provider: { "@id": ORG_ID() },
    areaServed: family === "locations" ? page.label : "United States",
    description: mdPlain(page.answer),
    offers: { "@type": "Offer", price: "0.90", priceCurrency: "USD", description: "Per completed phone order. No monthly fee." },
  };

  return (
    <SiteShell>
      <JsonLd
        data={graph(
          webPageJsonLd({ path, name: page.seoTitle, description: page.description }),
          breadcrumbJsonLd(crumbs),
          serviceNode,
          faqJsonLd(faq, path)
        )}
      />
      <div className="wrap pt-6">
        <Breadcrumbs crumbs={crumbs} />
      </div>
      <PageHero eyebrow={fam.eyebrow} title={page.h1} lead={page.lead}>
        <Link href="/try" className="btn-primary btn-lg">
          Build a free test host
        </Link>
        <Link href="/pricing" className="btn-ghost btn-lg">
          $0.90 per order
        </Link>
      </PageHero>

      <section className="section !pt-4">
        <div className="wrap">
          <div className="prose-card reveal">
            <LaunchAeoAnswer titleId={`${page.slug}-answer`} question={page.question} answer={mdPlain(page.answer)} />
          </div>
        </div>
      </section>

      {page.table ? (
        <section className="section" aria-labelledby="compare-table">
          <div className="wrap">
            <div className="section-head reveal">
              <h2 id="compare-table" className="h2">
                Side by side
              </h2>
            </div>
            <div className="seo-compare reveal">
              <table>
                <thead>
                  <tr>
                    <th scope="col">
                      <span className="sr-only">Compared on</span>
                    </th>
                    <th scope="col">ROAL phone host</th>
                    <th scope="col">{page.table.otherName}</th>
                  </tr>
                </thead>
                <tbody>
                  {page.table.rows.map((r) => (
                    <tr key={r.label}>
                      <th scope="row">{r.label}</th>
                      <td>{r.roal}</td>
                      <td>{r.other}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {page.verdict ? (
              <div className="prose-card reveal mt-6">
                <p className="seo-label">The short verdict</p>
                <p className="lead">{page.verdict}</p>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="section" aria-labelledby="pains-title">
        <div className="wrap">
          <div className="section-head reveal">
            <h2 id="pains-title" className="h2">
              <span className="tone-muted">What gets hard</span> on the phone
            </h2>
          </div>
          <div className="seo-grid reveal">
            {page.pains.map((p) => (
              <div key={p.title} className="seo-card">
                <h3>{p.title}</h3>
                <p>{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="helps-title">
        <div className="wrap">
          <div className="section-head reveal">
            <h2 id="helps-title" className="h2">
              How ROAL <span className="tone-muted">helps</span>
            </h2>
          </div>
          <div className="seo-grid seo-steps reveal">
            {page.howItHelps.map((p) => (
              <div key={p.title} className="seo-card">
                <h3>{p.title}</h3>
                <p>{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="demo-title">
        <div className="wrap">
          <div className="section-head reveal">
            <h2 id="demo-title" className="h2">
              What a call sounds like
            </h2>
            <p className="lead mt-4">An example call and the ticket it sends to the kitchen screen.</p>
          </div>
          <div className="seo-demo reveal">
            <div className="seo-card">
              <p className="seo-label">Example call</p>
              <div className="seo-call">
                {page.sampleCall.map((l, i) => (
                  <p key={i} className="seo-call__line m-0" data-who={l.who}>
                    <span className="seo-call__who">{l.who === "host" ? "Phone host" : "Caller"}</span>
                    {l.line}
                  </p>
                ))}
              </div>
            </div>
            <div className="seo-card seo-ticket">
              <p className="seo-label">Kitchen ticket</p>
              <div className="seo-ticket__head">
                <span>{page.sampleTicket.title}</span>
                <span>NEW</span>
              </div>
              <ul>
                {page.sampleTicket.lines.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
              {page.sampleTicket.note ? <p className="seo-ticket__note m-0">{page.sampleTicket.note}</p> : null}
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="prose-card seo-prose reveal">
            {page.sections.map((s) => (
              <div key={s.h2}>
                <h2 className="h3">{s.h2}</h2>
                <Markdown text={s.body} className="seo-md mt-3" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="landing-faq">
        <div className="wrap">
          <div className="faq-layout">
            <div className="reveal min-w-0">
              <p className="pill">
                <span className="pill__dot" aria-hidden />
                FAQ
              </p>
              <h2 id="landing-faq" className="h2 mt-5">
                Questions owners ask
              </h2>
              <p className="lead mt-4">
                Still unsure? <Link href="/try">Build your host</Link> and call it. Testing is free.
              </p>
            </div>
            <div className="reveal min-w-0">
              <FaqList items={faq} />
            </div>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="more-links">
        <div className="wrap">
          <h2 id="more-links" className="h3">
            More {fam.crumb.toLowerCase()}
          </h2>
          <ul className="seo-links mt-4">
            {siblings.map((s) => (
              <li key={s.slug}>
                <Link href={`/${family}/${s.slug}`}>{s.label}</Link>
              </li>
            ))}
          </ul>
          {posts.length ? (
            <>
              <h2 className="h3 mt-10">Guides from the blog</h2>
              <ul className="seo-links mt-4">
                {posts.map((p) => (
                  <li key={p.slug}>
                    <Link href={`/blog/${p.slug}`}>
                      {p.title}
                      <small>{p.excerpt}</small>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      </section>

      <ClosingCta />
    </SiteShell>
  );
}

/** Hub page listing every page in a family. */
export function LandingHub({ family, pages }: { family: LandingFamily; pages: LandingPageJson[] }) {
  const fam = LANDING_FAMILIES[family];
  const path = `/${family}`;
  const crumbs: Crumb[] = [
    { name: "Home", path: "/" },
    { name: fam.crumb, path },
  ];
  const origin = siteOrigin();
  return (
    <SiteShell>
      <JsonLd
        data={graph(
          webPageJsonLd({ path, name: fam.hubTitle, description: fam.hubLead, type: "CollectionPage" }),
          breadcrumbJsonLd(crumbs),
          {
            "@type": "ItemList",
            itemListElement: pages.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: `${origin}${path}/${p.slug}`, name: p.h1 })),
          }
        )}
      />
      <div className="wrap pt-6">
        <Breadcrumbs crumbs={crumbs} />
      </div>
      <PageHero eyebrow={fam.eyebrow} title={fam.hubTitle} lead={fam.hubLead}>
        <Link href="/try" className="btn-primary btn-lg">
          Build a free test host
        </Link>
      </PageHero>
      <section className="section !pt-4">
        <div className="wrap">
          <ul className="seo-links">
            {pages.map((p) => (
              <li key={p.slug}>
                <Link href={`${path}/${p.slug}`}>
                  {p.label}
                  <small>{p.lead}</small>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <ClosingCta />
    </SiteShell>
  );
}
