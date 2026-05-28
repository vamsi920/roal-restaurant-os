import { PublicCtaButton } from "@/components/landing/public";
import { HOME_PAY } from "@/lib/landing/home-pay-copy";

export function HomePay() {
  const { headline, amount, unit, note, pricingHref, ctaLabel } = HOME_PAY;
  const priceLabel = `${amount} ${unit}`;

  return (
    <section
      id="pay"
      className="home-section home-section--glass scroll-mt-24"
      aria-labelledby="pay-heading"
    >
      <div className="home-wrap">
        <div className="home-glass-panel home-pricing-teaser public-reveal">
          <h2 id="pay-heading" className="home-pricing-teaser__title">
            {headline}
          </h2>
          <p className="home-pricing-teaser__price" aria-label={priceLabel}>
            <span className="home-pricing-teaser__amount">{amount}</span>
            <span className="home-pricing-teaser__unit">{unit}</span>
          </p>
          <p className="home-pricing-teaser__note">{note}</p>
          <div className="home-pricing-teaser__cta">
            <PublicCtaButton
              href={pricingHref}
              label={ctaLabel}
              variant="primary"
              showArrow
              className="w-full sm:w-auto"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
