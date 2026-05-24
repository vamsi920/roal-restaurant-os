import { ContactHeroCta } from "@/components/landing/contact/contact-hero-cta";
import { ContactPageContent } from "@/components/landing/contact/contact-page-content";
import { MarketingPageHero } from "@/components/landing/marketing-page-hero";
import { MarketingShell } from "@/components/landing/marketing-shell";
import { CONTACT_PAGE_COPY } from "@/lib/landing/contact-page-copy";
import { buildContactPageMetadata } from "@/lib/landing/contact-metadata";

export const metadata = buildContactPageMetadata();

export default function ContactPage() {
  const { hero } = CONTACT_PAGE_COPY;

  return (
    <MarketingShell>
      <div className="public-contact-hero">
        <div className="public-contact-hero__wash" aria-hidden />
        <MarketingPageHero
          eyebrow={hero.eyebrow}
          title={hero.title}
          description={hero.description}
          titleId="contact-hero-heading"
        >
          <ContactHeroCta />
        </MarketingPageHero>
      </div>

      <ContactPageContent />
    </MarketingShell>
  );
}
