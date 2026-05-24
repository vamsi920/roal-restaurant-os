import { PRICING_PAGE_COPY } from "@/lib/landing/pricing-page-copy";
import { PricingCta } from "./pricing-cta";
import { PricingPilotSetup } from "./pricing-pilot-setup";
import { PricingPrimaryCard } from "./pricing-primary-card";
import { PublicCtaBand, PublicFaq } from "@/components/landing/public";
import { LandingSection } from "../landing-section";

export function PricingPageContent() {
  const copy = PRICING_PAGE_COPY;

  return (
    <div className="public-pricing-page">
      <LandingSection className="public-pricing-page__hero border-b-0 pt-6 sm:pt-10">
        <PricingPrimaryCard />
      </LandingSection>

      <LandingSection labelledBy={copy.pilot.titleId} className="public-pricing-page__pilot border-b-0">
        <PricingPilotSetup />
      </LandingSection>

      <PublicFaq
        id="faq"
        page="pricing"
        variant="accordion-marketing"
        sectionClassName="public-pricing-faq border-b-0"
        sectionHeader={{
          titleId: copy.faq.titleId,
          title: copy.faq.title,
        }}
      />

      <PublicCtaBand
        variant="glass"
        sectionClassName="public-pricing-close border-b-0"
        titleId={copy.close.titleId}
        title={copy.close.title}
        description={copy.close.description}
      >
        <PricingCta centered showSignupLink />
      </PublicCtaBand>
    </div>
  );
}
