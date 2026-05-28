import { PRICING_PAGE_COPY, PRICING_PILL_PRICE } from "@/lib/landing/pricing-page-copy";
import { PricingCta } from "./pricing-cta";

export function PricingPrimaryCard() {
  const card = PRICING_PAGE_COPY.primaryCard;

  return (
    <article
      id="rate"
      className="public-pricing-primary-card public-pricing-primary-card--hero glass-card min-w-0 scroll-mt-24"
      aria-labelledby={card.titleId}
    >
      <p className="public-pricing-primary-card__eyebrow">{card.eyebrow}</p>
      <h1 id={card.titleId} className="public-pricing-primary-card__headline">
        {card.headline}
      </h1>

      <div className="public-pricing-primary-card__hero">
        <p
          className="public-pricing-primary-card__price"
          aria-label={PRICING_PILL_PRICE}
        >
          <span className="public-pricing-primary-card__amount">{card.rate}</span>
          <span className="public-pricing-primary-card__unit">{card.rateUnit}</span>
        </p>
        {card.tagline ? (
          <p className="public-pricing-primary-card__tagline">{card.tagline}</p>
        ) : null}
        {card.rateNote ? (
          <p className="public-pricing-primary-card__sub">{card.rateNote}</p>
        ) : null}
      </div>

      {card.billableItems.length > 0 || card.freeItems.length > 0 ? (
        <div className="public-pricing-primary-card__lists">
          {card.billableItems.length > 0 ? (
            <div className="public-pricing-primary-card__list-block public-pricing-primary-card__list-block--success">
              <p className="public-pricing-primary-card__list-title">
                {card.billableHeading}
              </p>
              <ul className="public-pricing-primary-card__list">
                {card.billableItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {card.freeItems.length > 0 ? (
            <div className="public-pricing-primary-card__list-block">
              <p className="public-pricing-primary-card__list-title">{card.freeHeading}</p>
              <ul className="public-pricing-primary-card__list">
                {card.freeItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      <PricingCta className="public-pricing-primary-card__ctas" showSignupLink />
    </article>
  );
}
