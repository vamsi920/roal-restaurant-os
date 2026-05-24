import { SecurityFaqJsonLd } from "@/components/landing/security/security-faq-json-ld";
import { SecurityHeroCta } from "@/components/landing/security/security-hero-cta";
import { SecurityPageContent } from "@/components/landing/security/security-page-content";
import { MarketingPageHero } from "@/components/landing/marketing-page-hero";
import { MarketingShell } from "@/components/landing/marketing-shell";
import { buildSecurityPageMetadata } from "@/lib/landing/security-metadata";
import { SECURITY_PAGE_COPY } from "@/lib/landing/security-page-copy";

export const metadata = buildSecurityPageMetadata();

export default function SecurityPage() {
  const { hero } = SECURITY_PAGE_COPY;

  return (
    <MarketingShell>
      <SecurityFaqJsonLd />
      <div className="public-security-hero">
        <div className="public-security-hero__wash" aria-hidden />
        <MarketingPageHero
          eyebrow={hero.eyebrow}
          title={hero.title}
          description={hero.description}
          titleId="security-hero-heading"
        >
          <SecurityHeroCta />
        </MarketingPageHero>
      </div>

      <SecurityPageContent />
    </MarketingShell>
  );
}
