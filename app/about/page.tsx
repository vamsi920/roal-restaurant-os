import Link from "next/link";
import { Coins, PhoneCall, RefreshCcw, UsersRound } from "lucide-react";
import { LaunchAeoAnswer } from "@/components/landing/launch-aeo-answer";
import { ClosingCta } from "@/components/landing/home/closing-cta";
import { PageHero } from "@/components/landing/page-hero";
import { SiteShell } from "@/components/landing/site-shell";
import { buildAboutPageMetadata } from "@/lib/landing/about-metadata";
import { PRICING_RATE_AMOUNT } from "@/lib/landing/pricing-core";

export const metadata = buildAboutPageMetadata();

const BELIEFS = [
  {
    title: "The phone still matters",
    body: "Plenty of regulars would rather call than tap through an app. When nobody picks up, that order goes somewhere else.",
    Icon: PhoneCall,
    tile: "orange",
  },
  {
    title: "Your staff should stay on the floor",
    body: "ROAL takes the routine pickup calls. Allergies, complaints, catering, and anything that needs judgment go to a person.",
    Icon: UsersRound,
    tile: "blue",
  },
  {
    title: "The menu has to be live",
    body: "A phone host that recites last month's menu is worse than voicemail. ROAL reads what you have today, and skips what is sold out.",
    Icon: RefreshCcw,
    tile: "green",
  },
  {
    title: "Pay for results, not minutes",
    body: `${PRICING_RATE_AMOUNT} when a ticket lands in your kitchen. Nothing for questions, hang-ups, or test calls.`,
    Icon: Coins,
    tile: "amber",
  },
] as const;

export default function AboutPage() {
  return (
    <SiteShell>
      <PageHero
        eyebrow="Company"
        title={
          <>
            <span className="tone-muted">Built for the restaurant</span> that can&apos;t get to the phone.
          </>
        }
        lead="ROAL is a small team building an AI phone host for independent restaurants. It answers, takes pickup orders from your live menu, and sends the ticket to your kitchen."
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
              titleId="about-what-is-roal"
              question="What is ROAL?"
              answer="An AI phone host for restaurants. It answers calls, takes pickup orders from your live menu, answers questions about hours and the menu, and sends a kitchen ticket. You pay per completed order."
              detail="You can build one from your own website in about a minute and call it from the browser before you decide anything."
            />
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="about-beliefs">
        <div className="wrap">
          <div className="section-head reveal">
            <p className="pill">
              <span className="pill__dot" aria-hidden />
              What we believe
            </p>
            <h2 id="about-beliefs" className="h2 mt-5">
              <span className="tone-muted">Four things</span> we keep coming back to.
            </h2>
          </div>
          <div className="feature-grid feature-grid--4 mt-10">
            {BELIEFS.map(({ title, body, Icon, tile }) => (
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

      <ClosingCta />
    </SiteShell>
  );
}
