import { HomeCapabilitiesStrip } from "./home/sections/home-capabilities-strip";
import { HomeCtaBand } from "./home/sections/home-cta-band";
import { HomeFaq } from "./home/sections/home-faq";
import { HomeHowItWorks } from "./home/sections/home-how-it-works";
import { HomePay } from "./home/sections/home-pay";
import { HomeProductIntro } from "./home/sections/home-product-intro";
import { LandingHomeHero } from "./home/landing-home-hero";
import { LandingHomeShell } from "./home/landing-home-shell";

export function LandingPage() {
  return (
    <LandingHomeShell>
      <LandingHomeHero />
      <HomeProductIntro />
      <HomeCapabilitiesStrip />
      <HomeHowItWorks />
      <HomePay />
      <HomeFaq />
      <HomeCtaBand />
    </LandingHomeShell>
  );
}
