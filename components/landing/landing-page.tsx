import Image from "next/image";
import Link from "next/link";
import { LandingHomeShell } from "./home/landing-home-shell";

const heroProof = [
  "Picks up when staff cannot",
  "Speaks the customer's language",
  "Charges only for completed orders",
] as const;

const rushStory = [
  {
    label: "7:12 PM",
    title: "The phone rings while the line is out the door.",
    body: "Your team is cooking, packing, and helping guests. One unanswered call can become one lost order.",
  },
  {
    label: "ROAL picks up",
    title: "A natural voice takes the order.",
    body: "It answers in the customer's language, understands menu questions, confirms items, and captures pickup details.",
  },
  {
    label: "Kitchen ready",
    title: "Staff see the ticket, not the chaos.",
    body: "The kitchen gets the confirmed order, notes, time, and total in a clean view your team can act on.",
  },
] as const;

const setupSteps = [
  {
    step: "01",
    title: "Upload the menu",
    body: "Photos or PDFs become the live menu ROAL uses to answer calls and build orders.",
  },
  {
    step: "02",
    title: "Connect the phone",
    body: "Forward missed, busy-hour, or after-hours calls from the number guests already know.",
  },
  {
    step: "03",
    title: "Watch tickets arrive",
    body: "Completed calls turn into clean kitchen tickets for the right restaurant location.",
  },
] as const;

const ticketRows = [
  ["Guest", "Maria G. - repeat caller"],
  ["Language", "Spanish call - kitchen ticket in English"],
  ["Items", "2 margherita pizzas, garlic knots"],
  ["Timing", "Pickup at 7:40 PM"],
  ["Billing", "$0.90 only when this order succeeds"],
] as const;

const benefits = [
  {
    value: "Rush",
    label: "covered when the team is busiest",
  },
  {
    value: "24/7",
    label: "pickup coverage after closing and between shifts",
  },
  {
    value: "$0.90",
    label: "only after a successful order",
  },
] as const;

const faqs = [
  {
    question: "What problem does ROAL solve?",
    answer:
      "ROAL protects the phone orders restaurants lose when staff cannot answer during lunch rush, dinner rush, prep, closing, or after-hours.",
  },
  {
    question: "Does it sound like a normal phone call?",
    answer:
      "Yes. Guests can talk naturally, ask menu questions, change items, give notes, and order in the language they are most comfortable using.",
  },
  {
    question: "Do I pay for missed calls, hangups, or random questions?",
    answer:
      "No. The pricing promise is simple: ROAL charges for successful orders, not calls that never become revenue.",
  },
  {
    question: "Can my staff still answer the phone?",
    answer:
      "Yes. ROAL covers the calls your team cannot reach, without taking control away from the restaurant.",
  },
] as const;

const languageChips = ["English", "Spanish", "Hindi", "Guest's language"] as const;
const callBeats = ["Answers", "Understands", "Confirms", "Sends ticket"] as const;

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
      <path
        d="M5 12h13m-5-5 5 5-5 5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
      <path
        d="m5 12.5 4 4L19 7"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.3"
      />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
      <path
        d="M7.2 4.8 9 4.2c.7-.2 1.4.1 1.7.8l.8 2c.2.6.1 1.2-.4 1.6l-1 .9a8.3 8.3 0 0 0 4 4l.9-1c.4-.5 1-.6 1.6-.4l2 .8c.7.3 1 1 .8 1.7l-.6 1.8c-.3.8-1.1 1.3-2 1.3C10.8 18.2 5.8 13.2 5.8 7.1c0-1 .6-1.9 1.4-2.3Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M15.7 5.4c1.2.4 2 1.2 2.5 2.5M16.4 2.6a8 8 0 0 1 5 5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function LandingPage() {
  return (
    <LandingHomeShell>
      <section className="roal-hero" aria-labelledby="hero-heading">
        <div className="roal-hero__stage public-reveal">
          <div className="roal-hero__copy">
            <p className="roal-kicker">AI phone orders for restaurants</p>
            <h1 id="hero-heading" className="roal-hero__title">
              Never miss another phone order.
            </h1>
            <p className="roal-hero__lead">
              ROAL answers in the customer&apos;s language and sends the order to
              your kitchen.
            </p>

            <div className="roal-hero__actions" aria-label="Primary actions">
              <Link href="/demo" className="roal-button roal-button--primary">
                Hear a demo call
                <ArrowIcon />
              </Link>
              <Link href="/pricing" className="roal-button roal-button--secondary">
                Only pay for successful orders
              </Link>
            </div>

            <div className="roal-hero__price-note" aria-label="Pricing promise">
              <strong>$0.90</strong>
              <span>only after a real phone order succeeds</span>
            </div>

            <div className="roal-hero__proof" aria-label="ROAL promises">
              {heroProof.map((item) => (
                <span key={item}>
                  <CheckIcon />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="roal-hero__visual" aria-label="A live phone order becomes a kitchen ticket">
            <Image
              src="/landing/hero-restaurant-counter.png"
              alt="Restaurant counter during a busy pickup rush"
              width={1672}
              height={941}
              priority
              className="roal-hero__image"
            />
            <div className="roal-hero__status" aria-label="ROAL call flow">
              {callBeats.map((beat) => (
                <span key={beat}>{beat}</span>
              ))}
            </div>
            <div className="roal-call-card">
              <div className="roal-call-card__top">
                <span>
                  <PhoneIcon />
                  Live phone order
                </span>
                <strong>00:48</strong>
              </div>
              <div className="roal-language-row" aria-label="Languages ROAL can handle">
                {languageChips.map((language) => (
                  <span key={language}>{language}</span>
                ))}
              </div>
              <p className="roal-call-card__line">
                &ldquo;Two margherita pizzas, garlic knots, pickup at 7:40.&rdquo;
              </p>
              <div className="roal-call-card__ticket">
                <span>Ticket sent</span>
                <strong>Kitchen sees the order now</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="roal-section roal-section--story" aria-labelledby="story-heading">
        <div className="home-wrap roal-story-layout">
          <div className="roal-section__copy public-reveal">
            <p className="roal-kicker">The real problem</p>
            <h2 id="story-heading">Busy restaurants do not lose demand. They lose reachable moments.</h2>
            <p>
              Guests still call. They still want pickup. ROAL makes sure the call is
              answered when your team is too busy to grab the phone.
            </p>
          </div>

          <div className="roal-story-cards public-reveal-stagger">
            {rushStory.map((item) => (
              <article key={item.label} className="roal-story-card public-reveal-item">
                <span>{item.label}</span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="roal-section roal-section--steps" aria-labelledby="steps-heading">
        <div className="home-wrap roal-steps-layout">
          <div className="roal-section__copy roal-section__copy--center public-reveal">
            <p className="roal-kicker">How it starts</p>
            <h2 id="steps-heading">Menu in. Phone connected. Orders out.</h2>
            <p>Built for owners who want fewer missed calls, not another system to babysit.</p>
          </div>

          <div className="roal-steps-panel public-reveal">
            <Image
              src="/landing/menu-food-grid.png"
              alt="Restaurant menu items ready for phone ordering"
              width={1200}
              height={900}
              className="roal-steps-panel__menu"
            />
            <ol className="roal-steps public-reveal-stagger">
              {setupSteps.map((item) => (
                <li key={item.step} className="roal-step public-reveal-item">
                  <span>{item.step}</span>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="roal-section" aria-labelledby="ticket-heading">
        <div className="home-wrap roal-ticket-layout public-reveal">
          <div className="roal-section__copy">
            <p className="roal-kicker">What staff sees</p>
            <h2 id="ticket-heading">No transcript hunting. Just the order.</h2>
            <p>
              ROAL keeps the conversation natural for the guest and turns it into
              the simple ticket your team needs.
            </p>
          </div>

          <div className="roal-ticket-card" aria-label="Example kitchen ticket">
            <div className="roal-ticket-card__head">
              <span>Phone order</span>
              <strong>#1273</strong>
            </div>
            {ticketRows.map(([label, value]) => (
              <div key={label} className="roal-ticket-card__row">
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="roal-section roal-section--pricing" aria-labelledby="pay-heading">
        <div className="home-wrap roal-pay-panel public-reveal">
          <div className="roal-pay-panel__copy">
            <p className="roal-kicker">Simple pricing</p>
            <h2 id="pay-heading">Pay when ROAL brings in an order.</h2>
            <p>No charge for hangups, wrong numbers, or questions that do not become orders.</p>
          </div>

          <div className="roal-pay-panel__price" aria-label="$0.90 per successful order">
            <strong>$0.90</strong>
            <span>per successful order</span>
            <Link href="/pricing" className="roal-button roal-button--primary">
              See simple pricing
              <ArrowIcon />
            </Link>
          </div>
        </div>
      </section>

      <section className="roal-section roal-section--proof" aria-labelledby="proof-heading">
        <div className="home-wrap">
          <div className="roal-proof-strip public-reveal">
            <div>
              <p className="roal-kicker">Why it matters</p>
              <h2 id="proof-heading">More phone revenue without another phone shift.</h2>
            </div>
            <dl>
              {benefits.map((item) => (
                <div key={item.label}>
                  <dt>{item.value}</dt>
                  <dd>{item.label}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section className="roal-section" aria-labelledby="faq-heading">
        <div className="home-wrap roal-faq-layout">
          <div className="roal-section__copy public-reveal">
            <p className="roal-kicker">Questions owners ask</p>
            <h2 id="faq-heading">Clear before the first call.</h2>
          </div>

          <div className="roal-faq-list public-reveal-stagger">
            {faqs.map((item) => (
              <details key={item.question} className="roal-faq-item public-reveal-item">
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="roal-section roal-section--final" aria-labelledby="final-heading">
        <div className="home-wrap">
          <div className="roal-final-panel public-reveal">
            <Image
              src="/landing/final-cta-pizzeria.png"
              alt="Restaurant pickup counter ready for phone orders"
              width={1956}
              height={804}
              className="roal-final-panel__image"
            />
            <div className="roal-final-panel__copy">
              <p className="roal-kicker">Try one call first</p>
              <h2 id="final-heading">Hear ROAL take an order from your menu.</h2>
              <p className="roal-final-panel__lead">
                Bring your menu. Listen to a real ordering scenario. See the exact
                ticket your team would receive.
              </p>
              <div className="roal-hero__actions">
                <Link href="/demo" className="roal-button roal-button--primary">
                  Hear a demo call
                  <ArrowIcon />
                </Link>
                <Link href="/signup?next=/dashboard/restaurants" className="roal-button roal-button--secondary">
                  Start setup
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </LandingHomeShell>
  );
}
