import Link from "next/link";
import { ArrowRight, Check, Minus } from "lucide-react";
import { FocusTrialButton } from "@/components/landing/home/focus-trial-button";
import {
  PRICING_NO_ORDER_LINE,
  PRICING_RATE_AMOUNT,
  PRICING_VALUE_HEADLINE,
} from "@/lib/landing/pricing-core";

const INCLUDED = [
  "No monthly fee",
  "No per-minute fees",
  "No setup fee, no contracts",
  "Unlimited calls, questions, and test calls",
] as const;

const COMPARE = [
  { label: "Monthly fee", roal: "None", typical: "Per location, every month" },
  { label: "A slow week", roal: "You pay less", typical: "Same monthly fee" },
  { label: "You pay when", roal: "A completed order hits your kitchen", typical: "The month renews" },
] as const;

export function HomePricing() {
  return (
    <section className="section" id="pricing" aria-labelledby="home-pricing-title">
      <div className="wrap">
        <div className="section-head section-head--center reveal">
          <p className="pill">
            <span className="pill__dot" aria-hidden />
            Pricing
          </p>
          <h2 id="home-pricing-title" className="h2 mt-5">
            <span className="tone-muted">{PRICING_VALUE_HEADLINE}.</span> Nothing else.
          </h2>
        </div>

        <div className="price-teaser reveal">
          <div className="price-hero">
            <p className="price-hero__label">Per completed phone order</p>
            <p className="price-hero__amount">
              <strong>{PRICING_RATE_AMOUNT}</strong>
            </p>
            <p className="price-hero__note">{PRICING_NO_ORDER_LINE}</p>
            <ul className="checklist">
              {INCLUDED.map((item) => (
                <li key={item}>
                  <span className="checklist__icon">
                    <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <div className="price-hero__actions">
              <FocusTrialButton className="btn-primary btn-lg">
                Try it free <ArrowRight className="h-4 w-4" />
              </FocusTrialButton>
              <Link href="/pricing" className="btn-ghost btn-lg">
                Pricing details
              </Link>
            </div>
          </div>

          <div className="compare" role="table" aria-label="ROAL compared with typical phone tools">
            <div className="compare__head" role="row">
              <span role="columnheader" className="sr-only">
                Item
              </span>
              <span role="columnheader" className="compare__us">
                ROAL
              </span>
              <span role="columnheader">Typical tools</span>
            </div>
            {COMPARE.map((row) => (
              <div key={row.label} className="compare__row" role="row">
                <span role="rowheader" className="compare__label">
                  {row.label}
                </span>
                <span role="cell" className="compare__us">
                  <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={3} aria-hidden />
                  {row.roal}
                </span>
                <span role="cell" className="compare__them">
                  <Minus className="h-3.5 w-3.5 shrink-0" strokeWidth={3} aria-hidden />
                  {row.typical}
                </span>
              </div>
            ))}
            <p className="compare__note">
              Typical phone tools charge a monthly fee per location, whether or not calls turn
              into orders. ROAL only charges when one does.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
