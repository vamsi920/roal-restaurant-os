import { PublicCtaButton } from "@/components/landing/public";
import { HOME_PAY } from "@/lib/landing/home-pay-copy";

export function HomePay() {
  const { title, price, priceNote, pricingHref, ctaLabel } = HOME_PAY;

  return (
    <section
      id="pay"
      className="home-section home-section--glass scroll-mt-24"
      aria-labelledby="pay-heading"
    >
      <div className="home-wrap">
        <div className="home-glass-panel home-pricing-teaser">
          <h2 id="pay-heading" className="home-pricing-teaser__title">
            {title}
          </h2>
          <p className="home-pricing-teaser__price" aria-label={`${price} per successful order`}>
            {price}
          </p>
          <p className="home-pricing-teaser__note">{priceNote}</p>
          <div className="home-pricing-teaser__cta">
            <PublicCtaButton
              href={pricingHref}
              label={ctaLabel}
              variant="ghost"
              showArrow
              className="w-full sm:w-auto"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
