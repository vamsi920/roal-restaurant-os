import { TrialBuilder } from "@/components/try/trial-builder";
import { PhoneStage } from "@/components/landing/home/phone-mock";
import type { TrialPublicView } from "@/lib/trial/types";
import { PRICING_RATE_AMOUNT } from "@/lib/landing/pricing-core";

const TRUST = ["No sign-up", "Ready in about a minute", `${PRICING_RATE_AMOUNT} per completed order`] as const;

export function HomeHero({ initialTrial }: { initialTrial: TrialPublicView | null }) {
  return (
    <section className="hero" id="try" aria-labelledby="hero-title">
      <div className="wrap hero__inner">
        <p className="pill hero__pill">
          <span className="pill__dot" aria-hidden />
          AI phone host for restaurants
        </p>
        <h1 id="hero-title" className="hero__title">
          Never miss another order.
          <br />
          <span className="hero__title-soft">Your phone, answered </span>
          <span className="text-money">24/7.</span>
        </h1>
        <p className="hero__lead">
          Paste your website or Google Maps link. ROAL learns your menu and hours, then takes pickup
          orders and answers questions while your team stays on the floor.
        </p>

        <div className="hero__builder">
          <TrialBuilder mode="public" initialTrial={initialTrial} embedded autofocus />
        </div>

        <ul className="hero__trust" aria-label="Quick facts">
          {TRUST.map((fact) => (
            <li key={fact}>{fact}</li>
          ))}
        </ul>
      </div>

      <PhoneStage />
    </section>
  );
}
