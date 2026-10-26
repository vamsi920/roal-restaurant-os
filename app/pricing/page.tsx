import Link from "next/link";
import { FaqList } from "@/components/landing/faq-list";
import { PricingCard, PricingSplit } from "@/components/landing/pricing-card";
import { SiteShell } from "@/components/landing/site-shell";
import { PRICING_FAQ } from "@/lib/landing/launch-faq";
import { PRICING_RATE_AMOUNT, PRICING_RATE_LINE } from "@/lib/landing/pricing-core";
import { buildPricingPageMetadata } from "@/lib/landing/pricing-metadata";
import { absoluteUrl } from "@/lib/site-url";

export const metadata = buildPricingPageMetadata();

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
      <section className="page-hero">
        <div className="wrap">
          <div className="page-hero__copy">
            <p className="eyebrow">Pricing</p>
            <h1 className="h1">One price. {PRICING_RATE_LINE}.</h1>
            <p className="lead">
              No per-minute fees. No monthly fee. No contract. If a call does not turn into a ticket on your
              kitchen screen, it is free.
            </p>
          </div>
        </div>
      </section>

      <section className="section" aria-label="Price">
        <div className="wrap reveal">
          <PricingCard showCta={false} />
        </div>
      </section>

      <section className="section" aria-labelledby="pricing-orders-heading">
        <div className="wrap">
          <div className="max-w-xl reveal">
            <p className="eyebrow">What counts</p>
            <h2 className="h2 mt-3">When {PRICING_RATE_AMOUNT} is charged, and when it is not.</h2>
          </div>
          <div className="mt-8 reveal">
            <PricingSplit />
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="pricing-faq-heading">
        <div className="wrap">
          <div className="grid gap-8 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:gap-12">
            <div className="reveal min-w-0">
              <p className="eyebrow">FAQ</p>
              <h2 id="pricing-faq-heading" className="h2 mt-3">
                Pricing questions
              </h2>
              <p className="lead mt-4">Still unsure? Build your host first. You will not be charged for testing.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/try" className="btn-primary btn-lg">
                  Try it free
                </Link>
                <Link href="/contact" className="btn-ghost btn-lg">
                  Talk to us
                </Link>
              </div>
            </div>
            <div className="reveal min-w-0">
              <FaqList items={PRICING_FAQ} />
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
