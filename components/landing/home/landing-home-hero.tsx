import { HOME_HERO, HOME_HERO_CTA } from "@/lib/landing/home-theme";
import { LandingHomeCta } from "./landing-home-cta";
import { LandingHomePricingPill } from "./landing-home-pricing-pill";

export function LandingHomeHero() {
  return (
    <section id="hero" className="home-hero" aria-labelledby="hero-heading">
      <div className="home-hero__surface public-reveal">
        <div className="home-hero__content">
          <p className="home-hero__eyebrow">AI phone host for pickup orders</p>
          <h1 id="hero-heading" className="home-display home-hero__title">
            {HOME_HERO.title}
          </h1>
          <p className="home-lead home-hero__lead">{HOME_HERO.lead}</p>
          <div className="home-hero__signals" aria-label="ROAL value summary">
            <span>Answers when staff are busy</span>
            <span>Speaks like a trained host</span>
            <span>Charges only for real orders</span>
          </div>
          <LandingHomePricingPill />
          <LandingHomeCta
            className="home-hero__ctas"
            primary={HOME_HERO_CTA.primary}
            secondary={HOME_HERO_CTA.secondary}
          />
        </div>
        <div className="home-hero__visual" aria-label="ROAL answering a pickup call">
          <div className="home-phone-card">
            <div className="home-phone-card__top">
              <span className="home-phone-card__status">Live phone agent</span>
              <span className="home-phone-card__timer">Dinner rush</span>
            </div>
            <div className="home-phone-card__call">
              <span className="home-phone-card__avatar">R</span>
              <div>
                <p className="home-phone-card__label">Customer call</p>
                <p className="home-phone-card__quote">
                  I can take your pickup order.
                </p>
              </div>
            </div>
            <div className="home-call-script" aria-label="Short example phone order">
              <p>
                <span>Guest</span>
                Can I get biryani, medium spice?
              </p>
              <p>
                <span>ROAL</span>
                Got it. Pickup in 25 minutes under Maya?
              </p>
            </div>
            <div className="home-ticket-card">
              <p className="home-ticket-card__eyebrow">Kitchen ticket</p>
              <h3>Maya - pickup in 25 min</h3>
              <p>Biryani, medium spice. Name, phone, and pickup time confirmed.</p>
            </div>
          </div>
          <div className="home-hero__proof-row" aria-label="Restaurant benefits">
            <span>Call handled</span>
            <span>Order confirmed</span>
            <span>Kitchen updated</span>
          </div>
        </div>
      </div>
    </section>
  );
}
