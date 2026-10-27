import Link from "next/link";
import { PhoneStage } from "@/components/landing/home/phone-mock";
import { StartLinkForm } from "@/components/start/start-link-form";
import type { TrialPublicView } from "@/lib/trial/types";
import { PRICING_RATE_AMOUNT } from "@/lib/landing/pricing-core";

const TRUST = ["No sign-up", "Ready in about 2 minutes", `${PRICING_RATE_AMOUNT} per completed order`] as const;

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
          Paste your website or Google Maps link. ROAL learns your menu and hours, builds your phone host, and
          has it call you, all in about two minutes.
        </p>

        <div className="hero__builder">
          <StartLinkForm />
          {initialTrial ? (
            <p className="hero__resume">
              <Link href="/try">
                Pick up where you left off with {initialTrial.restaurantName ?? "your restaurant"} →
              </Link>
            </p>
          ) : null}
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
