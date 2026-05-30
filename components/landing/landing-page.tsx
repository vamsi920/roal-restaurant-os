import { HomeCtaBand } from "./home/sections/home-cta-band";
import { HomeFaq } from "./home/sections/home-faq";
import { HomeHowItWorks } from "./home/sections/home-how-it-works";
import { HomePay } from "./home/sections/home-pay";
import { HomeProductIntro } from "./home/sections/home-product-intro";
import { HomeProductProof } from "./home/sections/home-product-proof";
import { LandingHomeHero } from "./home/landing-home-hero";
import { LandingHomeShell } from "./home/landing-home-shell";

export function LandingPage() {
  return (
    <LandingHomeShell>
      <LandingHomeHero />
      <HomeProductIntro />
      <HomeProductProof />
      <HomeHowItWorks />
      <HomePay />
      <HomeFaq />
      <HomeCtaBand />
    </LandingHomeShell>
  );
}
