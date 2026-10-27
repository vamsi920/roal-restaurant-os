import Link from "next/link";
import {
  BarChart3,
  Bot,
  Check,
  Clock,
  Layers,
  Link2,
  Wallet,
} from "lucide-react";
import { FaqList } from "@/components/landing/faq-list";
import { ClosingCta } from "@/components/landing/home/closing-cta";
import { PageHero } from "@/components/landing/page-hero";
import { PricingPlans, PricingSplit } from "@/components/landing/pricing-card";
import { SiteShell } from "@/components/landing/site-shell";
import { PRICING_FAQ } from "@/lib/landing/launch-faq";
import { PRICING_ORDER_EXPLAINER, PRICING_RATE_AMOUNT } from "@/lib/landing/pricing-core";
import { buildPricingPageMetadata } from "@/lib/landing/pricing-metadata";
import { absoluteUrl } from "@/lib/site-url";

export const metadata = buildPricingPageMetadata();

const INCLUDED = [
  "AI phone host, 24/7",
  "Unlimited simultaneous calls",
  "Pickup & delivery orders",
  "Live menu sync",
  "Kitchen display",
  "Call transcripts & recordings",
  "FAQ knowledge base",
  "Upsell rules",
  "Multilingual callers",
  "Staff handoff alerts",
  "Reservation requests",
  "Multi-location menus",
  "Analytics",
] as const;

const WHY = [
  {
    title: "You pay for orders, not minutes",
    body: `${PRICING_RATE_AMOUNT} when a completed order lands in your kitchen. Questions and hang-ups are free.`,
    Icon: Wallet,
    tile: "orange",
  },
  {
    title: "Live in about a minute",
    body: "Paste your website or Google Maps link and call your own host from the browser.",
    Icon: Link2,
    tile: "blue",
  },
  {
    title: "Never busy",
    body: "Several callers at once? Each one gets the host. No hold music during the rush.",
    Icon: Layers,
    tile: "green",
  },
  {
    title: "Your menu, as it is today",
    body: "Edit an item or mark it sold out, and the next caller hears the change.",
    Icon: Clock,
    tile: "amber",
  },
  {
    title: "People stay in charge",
    body: "Catering, complaints, and manager requests go to your team with a summary.",
    Icon: Bot,
    tile: "rose",
  },
  {
    title: "See what happened",
    body: "Every call keeps its transcript. Reports show peak hours, popular items, and upsells.",
    Icon: BarChart3,
    tile: "ink",
  },
] as const;

function PricingJsonLd() {
  const graph = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    url: absoluteUrl("/pricing") ?? "/pricing",
    mainEntity: PRICING_FAQ.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }} />;
}

export default function PricingPage() {
  return (
    <SiteShell>
      <PricingJsonLd />
      <PageHero
        eyebrow="Pricing"
        title={
          <>
            One simple price.
            <br />
            <span className="text-money">{PRICING_RATE_AMOUNT}</span> per completed order.
          </>
        }
        lead="No monthly fee. No per-minute fees. No contracts. If a call doesn't turn into a ticket in your kitchen, it's free."
      >
        <Link href="/try" className="btn-primary btn-lg">
          Try it free
        </Link>
        <Link href="/contact" className="btn-ghost btn-lg">
          Talk to us
        </Link>
      </PageHero>

      <section className="section !pt-4" aria-label="Plans">
        <div className="wrap reveal">
          <PricingPlans />
        </div>
      </section>

      <section className="section" aria-labelledby="included-title">
        <div className="wrap">
          <div className="section-head reveal">
            <h2 id="included-title" className="h2">
              Everything included. <span className="tone-muted">No tiers, no add-ons.</span>
            </h2>
          </div>
          <div className="included reveal">
            <ul className="checklist checklist--cols">
              {INCLUDED.map((item) => (
                <li key={item}>
                  <span className="checklist__icon">
                    <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="why-title">
        <div className="wrap">
          <div className="section-head reveal">
            <p className="pill">
              <span className="pill__dot" aria-hidden />
              Why owners pick ROAL
            </p>
            <h2 id="why-title" className="h2 mt-5">
              <span className="tone-muted">Built around</span> the order, not the minute.
            </h2>
          </div>
          <div className="why-grid">
            {WHY.map(({ title, body, Icon, tile }) => (
              <div key={title} className="why-item reveal">
                <span className={`icon-tile icon-tile--${tile}`} aria-hidden>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby={PRICING_ORDER_EXPLAINER.titleId}>
        <div className="wrap">
          <div className="section-head reveal">
            <h2 id={PRICING_ORDER_EXPLAINER.titleId} className="h2">
              {PRICING_ORDER_EXPLAINER.title}
            </h2>
            <p className="lead mt-4">
              An order is complete when the caller confirms name, phone, and items, and the ticket lands on
              your kitchen screen.
            </p>
          </div>
          <div className="reveal">
            <PricingSplit />
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="pricing-faq-heading">
        <div className="wrap">
          <div className="faq-layout">
            <div className="reveal min-w-0">
              <p className="pill">
                <span className="pill__dot" aria-hidden />
                FAQ
              </p>
              <h2 id="pricing-faq-heading" className="h2 mt-5">
                <span className="tone-muted">Pricing</span> questions
              </h2>
              <p className="lead mt-4">Still unsure? Build your host first. Testing is free.</p>
            </div>
            <div className="reveal min-w-0">
              <FaqList items={PRICING_FAQ} />
            </div>
          </div>
        </div>
      </section>

      <ClosingCta />
    </SiteShell>
  );
}
