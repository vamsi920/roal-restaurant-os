import { HOME_HERO, HOME_HERO_CTA } from "@/lib/landing/home-theme";
import { LandingHomeCta } from "./landing-home-cta";
import { LandingHomePricingPill } from "./landing-home-pricing-pill";

export function LandingHomeHero() {
  return (
    <section id="hero" className="home-hero" aria-labelledby="hero-heading">
      <div className="home-hero__surface public-reveal">
        <div className="home-hero__content">
          <h1 id="hero-heading" className="home-display home-hero__title">
            {HOME_HERO.title}
          </h1>
          <p className="home-lead home-hero__lead">{HOME_HERO.lead}</p>
          <LandingHomePricingPill />
          <LandingHomeCta
            className="home-hero__ctas"
            primary={HOME_HERO_CTA.primary}
            secondary={HOME_HERO_CTA.secondary}
          />
        </div>
      </div>
    </section>
  );
}
