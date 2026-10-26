import { TrialBuilder } from "@/components/try/trial-builder";
import type { TrialPublicView } from "@/lib/trial/types";
import { PRICING_RATE_AMOUNT } from "@/lib/landing/pricing-core";

const FACTS = [
  "No sign-up to try",
  "Ready in about a minute",
  `${PRICING_RATE_AMOUNT} per completed order, nothing otherwise`,
] as const;

function Check() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12.5l4 4L19 7" />
    </svg>
  );
}

export function HomeHero({ initialTrial }: { initialTrial: TrialPublicView | null }) {
  return (
    <section className="hero" id="try" aria-labelledby="hero-title">
      <div className="hero__glow" aria-hidden />
      <div className="wrap hero__inner">
        <div className="hero__copy">
          <p className="chip chip--accent">AI phone host for restaurants</p>
          <h1 id="hero-title" className="h1 hero__title">
            Your phone, answered.
            <br />
            Every order, <em>on the ticket.</em>
          </h1>
          <p className="lead hero__lead">
            ROAL picks up when your team can&apos;t, takes pickup orders from your live menu, answers
            hours and menu questions, and sends the ticket to your kitchen.
          </p>
        </div>

        <div className="hero__builder">
          <TrialBuilder mode="public" initialTrial={initialTrial} embedded autofocus />
        </div>

        <ul className="hero__facts" aria-label="Quick facts">
          {FACTS.map((fact) => (
            <li key={fact}>
              <Check />
              {fact}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
