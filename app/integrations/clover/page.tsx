import Link from "next/link";
import { BadgeCheck, CreditCard, Link2, PhoneCall, Printer, Receipt } from "lucide-react";
import { FaqList } from "@/components/landing/faq-list";
import { PageHero } from "@/components/landing/page-hero";
import { SiteShell } from "@/components/landing/site-shell";
import { JsonLd } from "@/components/seo/json-ld";
import { buildPilotMailto } from "@/lib/landing/contact-mailto";
import type { LaunchFaqItem } from "@/lib/landing/launch-faq";
import { PUBLIC_CTA } from "@/lib/landing/public-cta";
import { buildPublicPageMetadata } from "@/lib/seo/public-open-graph";

export const metadata = buildPublicPageMetadata({
  title: "ROAL for Clover restaurants: phone orders on your Clover | ROAL",
  description:
    "ROAL's AI phone host takes pickup and delivery orders and sends them to your Clover with items, add-ons, notes and sales tax, then prints them in your kitchen. Early access, opening to restaurants in early 2027.",
  canonicalPath: "/integrations/clover",
});

const EARLY_ACCESS_MAILTO = buildPilotMailto({
  subject: "Clover early access for my restaurant",
  body: "Restaurant name:\nCity:\nClover device (Station, Mini, Flex...):\nRoughly how many phone orders a day:\n",
});

const STEPS = [
  {
    title: "Connect in two clicks",
    body: "In ROAL, open your restaurant's Settings and click Connect Clover. You approve ROAL on Clover's own sign-in page. ROAL never sees your Clover password.",
    Icon: Link2,
    tile: "blue",
  },
  {
    title: "A caller places an order",
    body: "The phone host takes the order from your live menu, reads it back, and confirms the caller's name and number.",
    Icon: PhoneCall,
    tile: "green",
  },
  {
    title: "It lands on your Clover",
    body: "The order shows up with your other orders: each item at your menu price, paid add-ons and choices as notes, your Clover sales tax, and the order total.",
    Icon: Receipt,
    tile: "orange",
  },
  {
    title: "It prints in the kitchen",
    body: "ROAL sends the ticket to your Clover order printer, marked as a ROAL phone order for pickup or delivery.",
    Icon: Printer,
    tile: "amber",
  },
  {
    title: "Customers pay at pickup",
    body: "Ring it up on your Clover like any other open order. ROAL never takes card numbers over the phone.",
    Icon: CreditCard,
    tile: "rose",
  },
  {
    title: "Your kitchen screen still works",
    body: "Every order also appears on the ROAL kitchen screen, so nothing is lost if the printer is offline or Clover is unreachable.",
    Icon: BadgeCheck,
    tile: "ink",
  },
] as const;

const CLOVER_FAQ: LaunchFaqItem[] = [
  {
    id: "clover-when",
    pages: [],
    question: "Can I connect my Clover today?",
    answer:
      "Not yet. The Clover connection is built and tested, and ROAL is waiting on Clover's app approval, which we expect in early 2027. Join early access and we will connect your restaurant first. You can use ROAL today with its kitchen screen on any tablet or computer.",
  },
  {
    id: "clover-access",
    pages: [],
    question: "What does ROAL read from my Clover?",
    answer:
      "Your merchant name and your default tax rates. It creates an order for each completed phone order and asks Clover to print it. It does not read your payments, customers, employees or other sales.",
  },
  {
    id: "clover-tax",
    pages: [],
    question: "Does the order include sales tax?",
    answer:
      "Yes. ROAL applies your Clover default tax rates to each item and sets the order total. Keep the sales tax in ROAL's settings the same as on your Clover so the total callers hear matches what they pay; ROAL warns you if they differ.",
  },
  {
    id: "clover-disconnect",
    pages: [],
    question: "How do I disconnect?",
    answer:
      "Click Disconnect Clover in your restaurant's Settings, or remove ROAL from your Clover account. Orders keep going to the ROAL kitchen screen.",
  },
  {
    id: "clover-other-pos",
    pages: [],
    question: "What about Toast or Square?",
    answer:
      "Clover is the first register ROAL connects to. If you use another POS, email us which one; it helps decide what comes next. Until then, orders go to the ROAL kitchen screen.",
  },
];

export default function CloverIntegrationPage() {
  return (
    <SiteShell>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: CLOVER_FAQ.map((f) => ({
            "@type": "Question",
            name: f.question,
            acceptedAnswer: { "@type": "Answer", text: f.answer },
          })),
        }}
      />
      <PageHero
        eyebrow="Clover integration · Early access"
        title={
          <>
            <span className="tone-muted">Phone orders,</span> straight to your Clover.
          </>
        }
        lead="ROAL answers your phone, takes the order from your menu, and sends it to your Clover with items, add-ons, notes and sales tax, then prints it in your kitchen. Opening to restaurants in early 2027, once Clover approves the ROAL app."
      >
        <a href={EARLY_ACCESS_MAILTO} className="btn-primary btn-lg">
          Join Clover early access
        </a>
        <Link href={PUBLIC_CTA.tryFree.href} className="btn-ghost btn-lg">
          Try ROAL free today
        </Link>
      </PageHero>

      <section className="section !pt-4" aria-label="How the Clover connection works">
        <div className="wrap">
          <div className="feature-grid feature-grid--3">
            {STEPS.map(({ title, body, Icon, tile }) => (
              <div key={title} className="feature reveal">
                <span className={`icon-tile icon-tile--lg icon-tile--${tile}`} aria-hidden>
                  <Icon className="h-5 w-5" />
                </span>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="clover-faq">
        <div className="wrap">
          <div className="faq-layout">
            <div className="reveal min-w-0">
              <p className="pill">
                <span className="pill__dot" aria-hidden />
                FAQ
              </p>
              <h2 id="clover-faq" className="h2 mt-5">
                <span className="tone-muted">Clover questions</span> owners ask
              </h2>
            </div>
            <div className="reveal min-w-0">
              <FaqList items={CLOVER_FAQ} />
            </div>
          </div>
          <p className="mx-auto mt-10 max-w-2xl text-center text-[13px] text-muted">
            Clover is a trademark of Clover Network, LLC. ROAL is an independent product and is not affiliated with or
            endorsed by Clover.
          </p>
        </div>
      </section>
    </SiteShell>
  );
}
