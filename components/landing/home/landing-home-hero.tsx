import { HOME_HERO, HOME_HERO_CTA } from "@/lib/landing/home-theme";
import { LandingHomeCta } from "./landing-home-cta";
import { LandingHomePricingPill } from "./landing-home-pricing-pill";

export function LandingHomeHero() {
  return (
    <section id="hero" className="home-hero" aria-labelledby="hero-heading">
      <div className="home-hero__surface public-reveal">
        <div className="home-hero__content">
          <p className="home-hero__eyebrow">AI phone ordering for restaurants</p>
          <h1 id="hero-heading" className="home-display home-hero__title">
            {HOME_HERO.title}
          </h1>
          <p className="home-lead home-hero__lead">{HOME_HERO.lead}</p>
          <p className="home-hero__owner-line">
            During the rush, your staff keeps cooking and serving. ROAL keeps the phone selling.
          </p>
          <div className="home-hero__promise" aria-label="ROAL phone order flow">
            <span>Customer calls</span>
            <span>ROAL answers</span>
            <span>Kitchen gets ticket</span>
          </div>
          <LandingHomeCta
            className="home-hero__ctas"
            primary={HOME_HERO_CTA.primary}
            secondary={HOME_HERO_CTA.secondary}
          />
          <LandingHomePricingPill />
          <div className="home-hero__signals" aria-label="Launch benefits">
            <span>Works on your normal phone line</span>
            <span>Speaks with guests naturally</span>
            <span>Pay only for successful orders</span>
          </div>
        </div>
        <div
          className="home-hero__visual"
          aria-label="ROAL answering a pickup call and creating an order"
        >
          <div className="home-phone-card">
            <div className="home-phone-card__top">
              <span className="home-phone-card__status">Live during dinner rush</span>
              <span className="home-phone-card__timer">00:42</span>
            </div>
            <div className="home-phone-card__call">
              <span className="home-phone-card__avatar">R</span>
              <div>
                <p className="home-phone-card__label">Incoming pickup call</p>
                <p className="home-phone-card__quote">
                  I can take your order now.
                </p>
              </div>
            </div>
            <div className="home-hero__route" aria-label="Call routed into a kitchen order">
              <span>Call</span>
              <span>Menu</span>
              <span>Total</span>
              <span>Kitchen</span>
            </div>
            <div className="home-call-script" aria-label="Short example phone order">
              <p>
                <span>Guest</span>
                Can I order in Spanish?
              </p>
              <p>
                <span>ROAL</span>
                Claro. I have the menu open.
              </p>
              <p>
                <span>Guest</span>
                Two margherita pizzas and garlic knots.
              </p>
            </div>
            <div className="home-order-ribbon" aria-label="Order value">
              <strong>Order captured</strong>
              <span>No voicemail. No staff interruption. No missed sale.</span>
            </div>
            <div className="home-ticket-card">
              <div className="home-ticket-card__topline">
                <p className="home-ticket-card__eyebrow">New ticket</p>
                <span>#1273</span>
              </div>
              <h3>Ready for pickup</h3>
              <ul>
                <li>
                  <span>Margherita Pizza</span>
                  <strong>$17.00</strong>
                </li>
                <li>
                  <span>Garlic Knots (6)</span>
                  <strong>$6.00</strong>
                </li>
                <li>
                  <span>Lemonade</span>
                  <strong>$3.00</strong>
                </li>
              </ul>
              <p>
                Total <strong>$28.47</strong>
              </p>
            </div>
          </div>
          <div className="home-hero__proof-row" aria-label="Restaurant benefits">
            <span>
              <strong>Busy line</strong> answered
            </span>
            <span>
              <strong>Any language</strong> order taking
            </span>
            <span>
              <strong>$0</strong> for hang-ups
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
