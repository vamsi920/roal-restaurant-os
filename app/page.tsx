import { Capabilities } from "@/components/landing/home/capabilities";
import { ClosingCta } from "@/components/landing/home/closing-cta";
import { CommandCenterSection } from "@/components/landing/home/command-center-section";
import { HomeFaq } from "@/components/landing/home/faq-section";
import { HomeHero } from "@/components/landing/home/hero";
import { HomeFaqJsonLd } from "@/components/landing/home/home-faq-json-ld";
import { SiteJsonLd } from "@/components/landing/home/site-json-ld";
import { HowItWorks } from "@/components/landing/home/how-it-works";
import { MissedCalls } from "@/components/landing/home/missed-calls";
import { HomePricing } from "@/components/landing/home/pricing-section";
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
      <SiteJsonLd />
      <HomeHero initialTrial={initialTrial} />
      <Capabilities />
      <HowItWorks />
      <CommandCenterSection />
      <MissedCalls />
      <HomePricing />
      <HomeFaq />
      <ClosingCta />
    </SiteShell>
  );
}
