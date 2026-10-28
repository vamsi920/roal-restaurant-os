import Link from "next/link";
import { ClosingCta } from "@/components/landing/home/closing-cta";
import { FaqList } from "@/components/landing/faq-list";
import { PageHero } from "@/components/landing/page-hero";
import { SiteShell } from "@/components/landing/site-shell";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { ALL_LAUNCH_FAQ, type LaunchFaqItem } from "@/lib/landing/launch-faq";
import { breadcrumbJsonLd, faqJsonLd, graph, webPageJsonLd } from "@/lib/seo/json-ld";
import { buildPublicPageMetadata } from "@/lib/seo/public-open-graph";

export const metadata = buildPublicPageMetadata({
  title: "ROAL FAQ: AI phone answering for restaurants",
  description:
    "Answers to what restaurant owners ask about ROAL: what it does, setup, call forwarding, pricing at $0.90 per completed order, languages, handoffs and privacy.",
  canonicalPath: "/faq",
});

const EXTRA: LaunchFaqItem[] = [
  {
    id: "faq-forward",
    pages: [],
    question: "Do I keep my restaurant's phone number?",
    answer:
      "Yes. ROAL gives your location its own line, and you forward your existing number to it, either all calls or only when you're busy or don't pick up. Turn forwarding off any time and your phone works as before.",
    link: { href: "/tools/call-forwarding-codes", label: "Call forwarding codes" },
  },
  {
    id: "faq-languages",
    pages: [],
    question: "Can it talk to callers who speak other languages?",
    answer: "Yes. The host answers in the language the caller speaks, and the order still lands on your kitchen screen as a normal ticket.",
  },
  {
    id: "faq-cards",
    pages: [],
    question: "Does it take credit card payments over the phone?",
    answer: "No. It never asks for card numbers. Callers pay at pickup, or however you already take payment.",
  },
  {
    id: "faq-pos",
    pages: [],
    question: "Do I need a POS connection?",
    answer:
      "No. Orders go to the ROAL kitchen screen, which runs on any tablet or computer browser. Your POS stays as it is.",
  },
  {
    id: "faq-busy",
    pages: [],
    question: "What happens when several people call at once?",
    answer: "Each caller gets the host. There's no busy signal and no hold music during the rush.",
  },
  {
    id: "faq-handoff",
    pages: [],
    question: "What calls does it pass to my staff?",
    answer:
      "Catering, complaints, allergy-sensitive questions and anyone who asks for a manager. Your team gets a short summary so nobody has to start over.",
  },
  {
    id: "faq-where",
    pages: [],
    question: "Where does ROAL work?",
    answer:
      "Any restaurant in the United States. It's built in Jersey City, and the first restaurants are in Jersey City and Hoboken.",
    link: { href: "/locations", label: "Locations" },
  },
];

export default function FaqPage() {
  const items = [...ALL_LAUNCH_FAQ, ...EXTRA];
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "FAQ", path: "/faq" },
  ];
  return (
    <SiteShell>
      <JsonLd
        data={graph(
          webPageJsonLd({ path: "/faq", name: "ROAL FAQ", description: "Questions restaurant owners ask about ROAL." }),
          breadcrumbJsonLd(crumbs),
          faqJsonLd(items, "/faq")
        )}
      />
      <div className="wrap pt-6">
        <Breadcrumbs crumbs={crumbs} />
      </div>
      <PageHero
        eyebrow="FAQ"
        title="Questions owners ask"
        lead="Straight answers about what ROAL does, what it costs and what it doesn't do."
      >
        <Link href="/try" className="btn-primary btn-lg">
          Build a free test host
        </Link>
      </PageHero>
      <section className="section !pt-4">
        <div className="wrap" style={{ maxWidth: "48rem" }}>
          <FaqList items={items} />
          <p className="seo-meta-links">
            Want the short version? Read <Link href="/facts">the ROAL fact sheet</Link>.
          </p>
        </div>
      </section>
      <ClosingCta />
    </SiteShell>
  );
}
