import { HOME_HERO, HOME_HERO_CTA } from "@/lib/landing/home-theme";
import { LandingHomeCta } from "./landing-home-cta";
import { LandingHomePricingPill } from "./landing-home-pricing-pill";

export function LandingHomeHero() {
  return (
    <section id="hero" className="home-hero" aria-labelledby="hero-heading">
      <div className="home-hero__surface public-reveal">
        <div className="home-hero__content">
          <p className="home-hero__eyebrow">AI phone agent for restaurants</p>
          <h1 id="hero-heading" className="home-display home-hero__title">
            {HOME_HERO.title}
          </h1>
          <p className="home-lead home-hero__lead">{HOME_HERO.lead}</p>
          <div className="home-hero__signals" aria-label="ROAL value summary">
            <span>Answers rush-hour calls</span>
            <span>Takes orders in the guest language</span>
            <span>Sends tickets to the kitchen</span>
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
              <span className="home-phone-card__status">ROAL is answering</span>
              <span className="home-phone-card__timer">7:18 PM rush</span>
            </div>
            <div className="home-phone-card__call">
              <span className="home-phone-card__avatar">R</span>
              <div>
                <p className="home-phone-card__label">Incoming pickup call</p>
                <p className="home-phone-card__quote">
                  Hi, I can take your order.
                </p>
              </div>
            </div>
            <div className="home-hero__route" aria-label="Call routed into a kitchen order">
              <span>Phone</span>
              <span>Menu</span>
              <span>Confirm</span>
              <span>Kitchen</span>
            </div>
            <div className="home-call-script" aria-label="Short example phone order">
              <p>
                <span>Guest</span>
                Can I get chicken biryani, medium spice?
              </p>
              <p>
                <span>ROAL</span>
                Got it. Pickup in 25 minutes under Maya?
              </p>
            </div>
            <div className="home-ticket-card">
              <p className="home-ticket-card__eyebrow">Kitchen ticket</p>
              <h3>Maya - pickup 7:43 PM</h3>
              <p>Chicken biryani, medium spice. Name, phone, and pickup time confirmed.</p>
            </div>
          </div>
          <div className="home-hero__proof-row" aria-label="Restaurant benefits">
            <span>No missed ring</span>
            <span>No per-minute fee</span>
            <span>No transcript hunting</span>
          </div>
        </div>
      </div>
    </section>
  );
}
