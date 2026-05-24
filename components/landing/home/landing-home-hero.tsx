import { HOME_HERO } from "@/lib/landing/home-theme";
import { LandingHomeCta } from "./landing-home-cta";
import { LandingHomePricingPill } from "./landing-home-pricing-pill";

export function LandingHomeHero() {
  return (
    <section id="hero" className="home-hero" aria-labelledby="hero-heading">
      <div className="home-hero__content public-reveal">
        <LandingHomePricingPill />
        <h1 id="hero-heading" className="home-display home-hero__title">
          {HOME_HERO.title}
        </h1>
        <p className="home-lead home-hero__lead">{HOME_HERO.lead}</p>
        <LandingHomeCta className="home-hero__ctas" />
      </div>
    </section>
  );
}
