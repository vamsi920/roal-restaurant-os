import { AboutPageContent } from "@/components/landing/about/about-page-content";
import { AboutCta } from "@/components/landing/about/about-cta";
import { MarketingPageHero } from "@/components/landing/marketing-page-hero";
import { MarketingShell } from "@/components/landing/marketing-shell";
import { buildAboutPageMetadata } from "@/lib/landing/about-metadata";
import { ABOUT_PAGE_COPY } from "@/lib/landing/about-page-copy";

export const metadata = buildAboutPageMetadata();

export default function AboutPage() {
  const { hero } = ABOUT_PAGE_COPY;

  return (
    <MarketingShell>
      <MarketingPageHero
        eyebrow={hero.eyebrow}
        title={hero.title}
        description={hero.description}
        titleId="about-hero-heading"
      >
        <AboutCta centered />
      </MarketingPageHero>

      <AboutPageContent />
    </MarketingShell>
  );
}
