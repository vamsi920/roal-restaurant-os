import { PricingPageContent } from "@/components/landing/pricing/pricing-page-content";
import { PricingFaqJsonLd } from "@/components/landing/pricing/pricing-faq-json-ld";
import { MarketingShell } from "@/components/landing/marketing-shell";
import { buildPricingPageMetadata } from "@/lib/landing/pricing-metadata";

export const metadata = buildPricingPageMetadata();

export default function PricingPage() {
  return (
    <MarketingShell>
      <PricingFaqJsonLd />
      <PricingPageContent />
    </MarketingShell>
  );
}
