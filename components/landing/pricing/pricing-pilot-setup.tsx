import { PRICING_PAGE_COPY } from "@/lib/landing/pricing-page-copy";

export function PricingPilotSetup() {
  const { titleId, title, lead, steps, note } = PRICING_PAGE_COPY.pilot;

  return (
    <div className="public-pricing-pilot min-w-0">
      <h2 id={titleId} className="public-pricing-pilot__title">
        {title}
      </h2>
      <p className="public-pricing-pilot__lead">{lead}</p>
      <ol className="public-pricing-pilot__steps">
        {steps.map((step, index) => (
          <li key={step}>
            <span className="public-pricing-pilot__step-num" aria-hidden>
              {index + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
      <p className="public-pricing-pilot__note">{note}</p>
    </div>
  );
}
