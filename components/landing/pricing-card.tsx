import Link from "next/link";
import {
  PRICING_NO_ORDER_LINE,
  PRICING_ORDER_EXPLAINER,
  PRICING_RATE_AMOUNT,
  PRICING_VALUE_HEADLINE,
} from "@/lib/landing/pricing-core";

const INCLUDED = [
  { text: "No per-minute phone fees", no: true },
  { text: "No monthly fee, no setup fee", no: true },
  { text: "No contracts. Stop by pointing your number back.", no: true },
  { text: "Unlimited calls, questions, and test calls", no: false },
  { text: "Live menu, hours, FAQs, and kitchen tickets included", no: false },
] as const;

function Check({ muted }: { muted?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {muted ? <path d="M6 12h12" /> : <path d="M5 12.5l4 4L19 7" />}
    </svg>
  );
}

/** Headline price card. Shared by the homepage pricing section and /pricing. */
export function PricingCard({ showCta = true }: { showCta?: boolean }) {
  return (
    <div className="price-card">
      <div className="min-w-0">
        <p className="eyebrow">Pricing</p>
        <h3 className="h2 mt-3">{PRICING_VALUE_HEADLINE}</h3>
        <div className="price-card__amount mt-6">
          <strong>{PRICING_RATE_AMOUNT}</strong>
          <span>per completed phone order</span>
        </div>
        <p className="lead mt-4 max-w-md">{PRICING_NO_ORDER_LINE}</p>
        {showCta ? (
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/try" className="btn-primary btn-lg">
              Try it free
            </Link>
            <Link href="/pricing" className="btn-ghost btn-lg">
              Pricing details
            </Link>
          </div>
        ) : null}
      </div>
      <ul className="price-card__list">
        {INCLUDED.map((item) => (
          <li key={item.text} data-no={item.no ? "true" : undefined}>
            <Check muted={item.no} />
            <span>{item.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Pay / don't pay explainer from pricing-core. */
export function PricingSplit() {
  const ex = PRICING_ORDER_EXPLAINER;
  return (
    <div className="price-split" aria-labelledby={ex.titleId}>
      <h3 id={ex.titleId} className="sr-only">
        {ex.title}
      </h3>
      <div className="price-split__col price-split__col--pay">
        <h3>You pay {PRICING_RATE_AMOUNT}</h3>
        <ul>
          <li>{ex.payLine}</li>
          {ex.payExamples.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      </div>
      <div className="price-split__col price-split__col--free">
        <h3>You pay nothing</h3>
        <ul>
          <li>{ex.noPayLine}</li>
          {ex.noPayExamples.map((e) => (
            <li key={e}>{e}</li>
          ))}
          <li>Questions about hours, menu, or directions</li>
        </ul>
      </div>
    </div>
  );
}
