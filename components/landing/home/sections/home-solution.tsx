function PhoneIcon() {
  return (
    <svg className="home-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M8 4h8l2 4v12H6V8l2-4z" strokeLinejoin="round" />
      <path d="M10 17h4" strokeLinecap="round" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg className="home-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M6 7h12M6 12h12M6 17h8" strokeLinecap="round" />
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  );
}

function TicketIcon() {
  return (
    <svg className="home-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M6 8h12v8H6z" strokeLinejoin="round" />
      <path d="M9 8v8M15 8v8" strokeLinecap="round" />
    </svg>
  );
}

import Link from "next/link";
import { HOME_TRUST_POINTS } from "@/lib/landing/home-trust-copy";

const CARDS = [
  {
    title: "Answers the phone",
    body: "Sounds like your team, not a phone tree.",
    icon: PhoneIcon,
  },
  {
    title: "Knows your menu",
    body: "Your items, modifiers, and prices—live.",
    icon: MenuIcon,
  },
  {
    title: "Sends the ticket",
    body: "Orders land on your kitchen screen.",
    icon: TicketIcon,
  },
] as const;

export function HomeSolution() {
  return (
    <section id="what" className="home-section home-section--glass scroll-mt-24" aria-labelledby="what-heading">
      <div className="home-wrap">
        <p className="home-eyebrow">Product</p>
        <h2 id="what-heading" className="home-h2 mt-2">
          What ROAL does
        </h2>
        <div className="home-card-grid public-reveal-stagger">
          {CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <article key={card.title} className="home-card public-reveal-item">
                <Icon />
                <h3>{card.title}</h3>
                <p>{card.body}</p>
              </article>
            );
          })}
        </div>

        <ul
          id="trust"
          className="home-trust public-reveal-stagger scroll-mt-24"
          aria-label="Trust and operations"
        >
          {HOME_TRUST_POINTS.map((point) => (
            <li key={point.id} className="home-trust__item public-reveal-item">
              {point.href ? (
                <Link href={point.href} className="home-trust__link">
                  <span className="home-trust__title">{point.title}</span>
                  <span className="home-trust__body">{point.body}</span>
                </Link>
              ) : (
                <div className="home-trust__content">
                  <span className="home-trust__title">{point.title}</span>
                  <span className="home-trust__body">{point.body}</span>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
