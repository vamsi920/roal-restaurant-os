import { ClosingCta } from "@/components/landing/home/closing-cta";
import { HomeFaq } from "@/components/landing/home/faq-section";
import { HomeHero } from "@/components/landing/home/hero";
import { HomeFaqJsonLd } from "@/components/landing/home/home-faq-json-ld";
import { HowItWorks } from "@/components/landing/home/how-it-works";
import { InkSection } from "@/components/landing/home/ink-section";
import { HomePricing } from "@/components/landing/home/pricing-section";
import { HomeStrip } from "@/components/landing/home/strip";
import { SiteShell } from "@/components/landing/site-shell";
import { buildHomePageMetadata } from "@/lib/landing/home-metadata";
import { readPendingTrialFromCookie } from "@/lib/trial/auth";
import { toPublicView } from "@/lib/trial/store";

export const metadata = buildHomePageMetadata();
export const dynamic = "force-dynamic";

export default async function Home() {
  const pending = await readPendingTrialFromCookie();
  const initialTrial = pending && pending.status === "ready" ? toPublicView(pending) : null;

  return (
    <SiteShell>
      <HomeFaqJsonLd />
      <HomeHero initialTrial={initialTrial} />
      <HomeStrip />
      <HowItWorks />
      <InkSection />
      <HomePricing />
      <HomeFaq />
      <ClosingCta />
    </SiteShell>
  );
}
