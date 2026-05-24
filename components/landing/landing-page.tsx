import { HomeCtaBand } from "./home/sections/home-cta-band";
import { HomeFaq } from "./home/sections/home-faq";
import { HomeHowItWorks } from "./home/sections/home-how-it-works";
import { HomeMetricsStrip } from "./home/sections/home-metrics-strip";
import { HomePay } from "./home/sections/home-pay";
import { LandingHomeHero } from "./home/landing-home-hero";
import { LandingHomeShell } from "./home/landing-home-shell";

export function LandingPage() {
  return (
    <LandingHomeShell>
      <LandingHomeHero />
      <HomeMetricsStrip />
      <HomeHowItWorks />
      <HomePay />
      <HomeFaq />
      <HomeCtaBand />
    </LandingHomeShell>
  );
}
