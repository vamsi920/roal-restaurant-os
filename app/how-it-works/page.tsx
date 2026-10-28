import Link from "next/link";
import { ClosingCta } from "@/components/landing/home/closing-cta";
import { HowItWorks } from "@/components/landing/home/how-it-works";
import { LaunchAeoAnswer } from "@/components/landing/launch-aeo-answer";
import { PageHero } from "@/components/landing/page-hero";
import { SiteShell } from "@/components/landing/site-shell";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { breadcrumbJsonLd, graph, siteOrigin, webPageJsonLd } from "@/lib/seo/json-ld";
import { buildPublicPageMetadata } from "@/lib/seo/public-open-graph";

export const metadata = buildPublicPageMetadata({
  title: "How ROAL works: an AI phone host from your link",
  description:
    "Paste your restaurant website or Google Maps link, test-call your AI phone host in about a minute, then forward your number. Orders land on your kitchen screen.",
  canonicalPath: "/how-it-works",
});

const STEPS = [
  { name: "Paste your link", text: "Enter your restaurant website, Google Maps link, or name and city at tryroal.com/try." },
  { name: "ROAL learns your menu and hours", text: "It reads your public pages, menu PDFs and photos for items, prices, hours and address. You can also upload a menu." },
  { name: "Test-call your host in the browser", text: "Place an order, ask a question, change your mind. Pick the voice and the name. No sign-up needed." },
  { name: "Claim it and forward your number", text: "Your location gets its own line. Forward your restaurant number to it, all calls or only when busy or unanswered." },
  { name: "Orders land on your kitchen screen", text: "Each confirmed order becomes a ticket with items, modifiers, name, phone and ready time. You pay $0.90 per completed order." },
];

const ON_A_CALL = [
  ["Takes the order", "Items, sizes, modifiers and notes, then the caller's name and phone. It quotes a ready time and reads the order back."],
  ["Answers questions", "Hours, address, parking and menu questions, from your live menu and the answers you approve."],
  ["Speaks their language", "Callers can talk in the language they're comfortable with."],
  ["Knows what's sold out", "Mark an item sold out and the next caller isn't offered it."],
  ["Hands off to people", "Catering, complaints, allergy-sensitive questions and manager requests go to your team with a summary."],
  ["Learns", "Questions it couldn't answer land in an inbox. Answer once, and it knows from then on."],
] as const;

export default function HowItWorksPage() {
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "How it works", path: "/how-it-works" },
  ];
  const origin = siteOrigin();
  return (
    <SiteShell>
      <JsonLd
        data={graph(
          webPageJsonLd({ path: "/how-it-works", name: "How ROAL works", description: "From your restaurant link to a live AI phone host." }),
          breadcrumbJsonLd(crumbs),
          {
            "@type": "HowTo",
            "@id": `${origin}/how-it-works#howto`,
            name: "How to set up an AI phone host for your restaurant with ROAL",
            totalTime: "PT10M",
            estimatedCost: { "@type": "MonetaryAmount", currency: "USD", value: "0" },
            step: STEPS.map((s, i) => ({ "@type": "HowToStep", position: i + 1, name: s.name, text: s.text, url: `${origin}/how-it-works#step-${i + 1}` })),
          }
        )}
      />
      <div className="wrap pt-6">
        <Breadcrumbs crumbs={crumbs} />
      </div>
      <PageHero
        eyebrow="How it works"
        title="From your link to a phone host that takes orders"
        lead="No sales call and no setup project. Paste a link, talk to your host, forward your number when you're ready."
      >
        <Link href="/try" className="btn-primary btn-lg">
          Try it on your menu
        </Link>
        <Link href="/pricing" className="btn-ghost btn-lg">
          See pricing
        </Link>
      </PageHero>
      <section className="section !pt-4">
        <div className="wrap">
          <div className="prose-card reveal">
            <LaunchAeoAnswer
              titleId="how-answer"
              question="How does ROAL set up an AI phone host for a restaurant?"
              answer="You paste your restaurant's website or Google Maps link. ROAL reads your menu, prices and hours, and builds a phone host you can call in your browser in about a minute. When you like it, you forward your restaurant number to the host's line and orders start landing on your kitchen screen."
            />
          </div>
        </div>
      </section>
      <HowItWorks />
      <section className="section" aria-labelledby="steps-title">
        <div className="wrap">
          <div className="section-head reveal">
            <h2 id="steps-title" className="h2">
              The five steps
            </h2>
          </div>
          <ol className="seo-grid seo-steps reveal">
            {STEPS.map((s, i) => (
              <li key={s.name} id={`step-${i + 1}`} className="seo-card list-none">
                <h3>{s.name}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <section className="section" aria-labelledby="call-title">
        <div className="wrap">
          <div className="section-head reveal">
            <h2 id="call-title" className="h2">
              What the host does <span className="tone-muted">on a call</span>
            </h2>
          </div>
          <div className="seo-grid reveal">
            {ON_A_CALL.map(([t, b]) => (
              <div key={t} className="seo-card">
                <h3>{t}</h3>
                <p>{b}</p>
              </div>
            ))}
          </div>
          <p className="seo-meta-links">
            Next: <Link href="/tools/call-forwarding-codes">call forwarding codes by carrier</Link> ·{" "}
            <Link href="/use-cases">use cases</Link> · <Link href="/faq">FAQ</Link>
          </p>
        </div>
      </section>
      <ClosingCta />
    </SiteShell>
  );
}
