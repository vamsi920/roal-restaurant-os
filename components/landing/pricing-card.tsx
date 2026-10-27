import Link from "next/link";
import { ArrowRight, Check, CircleSlash, Mail } from "lucide-react";
import { buildPilotMailto } from "@/lib/landing/contact-mailto";
import {
  PRICING_NO_ORDER_LINE,
  PRICING_ORDER_EXPLAINER,
  PRICING_RATE_AMOUNT,
} from "@/lib/landing/pricing-core";

const MAIN_POINTS = [
  "No monthly fee, no setup fee",
  "No per-minute phone fees",
  "No contracts. Stop by pointing your number back.",
  "Unlimited calls, questions, and test calls",
] as const;

const VOLUME_POINTS = [
  "Each location gets its own host and phone line",
  "Menus and hours per location",
  "Ask about a volume rate before you go live",
] as const;

function Checklist({ items }: { items: readonly string[] }) {
  return (
    <ul className="checklist">
      {items.map((item) => (
        <li key={item}>
          <span className="checklist__icon">
            <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
}

/** Headline price card + multi-location card. Used by /pricing. */
export function PricingPlans() {
  return (
    <div className="plans">
      <div className="plan plan--main">
        <div className="plan__head">
          <p className="plan__name">Pay per order</p>
          <span className="badge badge--live">Everything included</span>
        </div>
        <p className="plan__for">For any restaurant that takes orders by phone.</p>
        <p className="price-hero__amount mt-6">
          <strong>{PRICING_RATE_AMOUNT}</strong>
          <span>per completed phone order</span>
        </p>
        <p className="price-hero__note">{PRICING_NO_ORDER_LINE}</p>
        <Checklist items={MAIN_POINTS} />
        <div className="plan__actions">
          <Link href="/try" className="btn-primary btn-lg">
            Try it free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="plan">
        <div className="plan__head">
          <p className="plan__name">Several locations?</p>
        </div>
        <p className="plan__for">For groups and busy phone counters.</p>
        <p className="plan__big">Let&apos;s talk</p>
        <p className="price-hero__note">Same product, same per-order model. We set up each location with you.</p>
        <Checklist items={VOLUME_POINTS} />
        <div className="plan__actions">
          <a href={buildPilotMailto({ subject: "ROAL — multiple locations" })} className="btn-ghost btn-lg">
            <Mail className="h-4 w-4" /> Talk to us
          </a>
        </div>
      </div>
    </div>
  );
}

/** Pay / don't pay explainer from pricing-core. */
export function PricingSplit() {
  const ex = PRICING_ORDER_EXPLAINER;
  return (
    <div className="price-split">
      <div className="price-split__col price-split__col--pay">
        <h3>
          <span className="icon-tile icon-tile--orange" aria-hidden>
            <Check className="h-4 w-4" strokeWidth={2.5} />
          </span>
          You pay {PRICING_RATE_AMOUNT}
        </h3>
        <ul>
          {[ex.payLine, ...ex.payExamples].map((e) => (
            <li key={e}>
              <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden />
              {e}
            </li>
          ))}
        </ul>
      </div>
      <div className="price-split__col price-split__col--free">
        <h3>
          <span className="icon-tile icon-tile--green" aria-hidden>
            <CircleSlash className="h-4 w-4" strokeWidth={2.5} />
          </span>
          You pay nothing
        </h3>
        <ul>
          {[ex.noPayLine, ...ex.noPayExamples, "Questions about hours, menu, or directions"].map((e) => (
            <li key={e}>
              <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden />
              {e}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
