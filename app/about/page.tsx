import Link from "next/link";
import { LaunchAeoAnswer } from "@/components/landing/launch-aeo-answer";
import { PageHero } from "@/components/landing/page-hero";
import { SiteShell } from "@/components/landing/site-shell";
import { buildAboutPageMetadata } from "@/lib/landing/about-metadata";
import { CONTACT_PILOT_EMAIL } from "@/lib/landing/contact-mailto";
import { PRICING_RATE_AMOUNT } from "@/lib/landing/pricing-core";

export const metadata = buildAboutPageMetadata();

const BELIEFS = [
  {
    title: "The phone still matters",
    body: "Plenty of regulars would rather call than tap through an app. When nobody picks up, that order goes somewhere else.",
  },
  {
    title: "Your staff should stay on the floor",
    body: "ROAL takes the routine pickup calls. Allergies, complaints, catering, and anything that needs judgment go to a person.",
  },
  {
    title: "The menu has to be live",
    body: "A phone host that recites last month's menu is worse than voicemail. ROAL reads what you have today, and skips what is sold out.",
  },
  {
    title: "Pay for results, not minutes",
    body: `${PRICING_RATE_AMOUNT} when a ticket lands in your kitchen. Nothing for questions, hang-ups, or test calls.`,
  },
] as const;

export default function AboutPage() {
  return (
    <SiteShell>
      <PageHero
        eyebrow="About"
        title="Built for the restaurant that can't get to the phone."
        lead="ROAL is a small team building an AI phone host for independent restaurants. It answers, takes pickup orders from your live menu, and sends the ticket to your kitchen."
      >
        <Link href="/try" className="btn-primary btn-lg">
          Try it on your menu
        </Link>
        <Link href="/pricing" className="btn-ghost btn-lg">
          See pricing
        </Link>
      </PageHero>

      <section className="section">
        <div className="wrap">
          <LaunchAeoAnswer
            className="max-w-3xl reveal"
            titleId="about-what-is-roal"
            question="What is ROAL?"
            answer="An AI phone host for restaurants. It answers calls, takes pickup orders from your live menu, answers questions about hours and the menu, and sends a kitchen ticket. You pay per completed order."
            detail="You can build one from your own website in about a minute and call it from the browser before you decide anything."
          />
        </div>
      </section>

      <section className="section" aria-labelledby="about-beliefs">
        <div className="wrap">
          <div className="max-w-xl reveal">
            <p className="eyebrow">What we believe</p>
            <h2 id="about-beliefs" className="h2 mt-3">
              Four things we keep coming back to.
            </h2>
          </div>
          <div className="feature-grid mt-8 reveal">
            {BELIEFS.map((b, i) => (
              <div key={b.title} className="card feature">
                <span className="feature__icon font-mono text-sm">{String(i + 1).padStart(2, "0")}</span>
                <h3>{b.title}</h3>
                <p>{b.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="card card--ink reveal p-8 sm:p-10">
            <p className="eyebrow">Say hello</p>
            <h2 className="h2 mt-3">Questions, feedback, or a menu that breaks it?</h2>
            <p className="mt-4 max-w-xl text-base/80">
              We read every email. If your host says something wrong on a test call, send us the transcript and we will fix it.
            </p>
            <a href={`mailto:${CONTACT_PILOT_EMAIL}`} className="btn-accent btn-lg mt-6">
              {CONTACT_PILOT_EMAIL}
            </a>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
