import { PayInvoiceVisual } from "../illustrations/pay-invoice-visual";
import { LandingPosterReveal } from "../landing-poster-reveal";
import { LandingSection } from "../landing-section";

export function LandingPay() {
  return (
    <LandingSection
      id="pricing-story"
      labelledBy="pricing-story-heading"
      className="landing-pay landing-poster-block landing-poster-block--muted"
    >
      <LandingPosterReveal className="landing-pay__layout">
        <div className="landing-pay__copy">
          <h2 id="pricing-story-heading" className="landing-h2 max-w-xl text-balance">
            Pay only when an order reaches the kitchen.
          </h2>
        </div>
        <PayInvoiceVisual />
      </LandingPosterReveal>
    </LandingSection>
  );
}
