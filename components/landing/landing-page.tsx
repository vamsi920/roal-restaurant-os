import Image from "next/image";
import Link from "next/link";
import { LandingHomeShell } from "./home/landing-home-shell";

const heroProof = [
  "Answers when staff cannot",
  "Takes orders in the customer's language",
  "You pay only for successful orders",
] as const;

const rushStory = [
  {
    label: "Rush hour",
    title: "The phone keeps ringing.",
    body: "Your team is cooking, serving, packing, and the guest on the phone is already deciding where else to order.",
  },
  {
    label: "ROAL answers",
    title: "A calm voice takes over.",
    body: "ROAL greets the guest, understands the order, handles menu questions, and confirms pickup or delivery details.",
  },
  {
    label: "Kitchen ready",
    title: "Your staff sees the ticket.",
    body: "No transcript, no dashboard maze. Just the name, items, notes, timing, and total where your team can act.",
  },
] as const;

const setupSteps = [
  {
    step: "01",
    title: "Upload the menu",
    body: "ROAL learns dishes, modifiers, sold-out items, hours, and fulfillment rules.",
  },
  {
    step: "02",
    title: "Connect the phone",
    body: "Forward overflow, busy-hour, or after-hours calls from the number guests already use.",
  },
  {
    step: "03",
    title: "Watch orders arrive",
    body: "Every successful call becomes a clean ticket for the restaurant location it belongs to.",
  },
] as const;

const ticketRows = [
  ["Guest", "Maria G. · returning caller"],
  ["Language", "Spanish call · English ticket"],
  ["Items", "2 margherita pizzas, garlic knots"],
  ["Timing", "Pickup at 7:40 PM"],
  ["Charge", "$0.90 only after the order succeeds"],
] as const;

const benefits = [
  {
    value: "0",
    label: "missed rush calls needed",
  },
  {
    value: "24/7",
    label: "phone coverage when you want it",
  },
  {
    value: "$0.90",
    label: "per successful order",
  },
] as const;

const faqs = [
  {
    question: "What does ROAL do for my restaurant?",
    answer:
      "ROAL answers your phone, speaks naturally with guests, takes orders from your real menu, and sends a kitchen-ready ticket to the right restaurant location.",
  },
  {
    question: "Will guests understand they can just talk normally?",
    answer:
      "Yes. ROAL is built for normal phone conversation. Guests can ask menu questions, change items, give notes, and confirm the order in the language they are most comfortable using.",
  },
  {
    question: "Do I pay for missed calls, hangups, or random questions?",
    answer:
      "No. The pricing promise is simple: ROAL charges for successful orders, not noise.",
  },
  {
    question: "Can my staff still answer the phone?",
    answer:
      "Yes. ROAL is designed to protect the calls your team cannot reach during busy moments, not replace restaurant judgment.",
  },
] as const;

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
            <p className="roal-kicker">AI phone ordering for busy restaurants</p>
            <h1 id="hero-heading" className="roal-hero__title">
              Missed calls should not become missed orders.
            </h1>
            <p className="roal-hero__lead">
              ROAL answers your restaurant phone, speaks with guests like a trained
              host, takes the order in their language, and sends your kitchen a clean
              ticket.
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
            <div className="roal-call-card">
              <div className="roal-call-card__top">
                <span>
                  <PhoneIcon />
                  Live order call
                </span>
                <strong>00:48</strong>
              </div>
              <p className="roal-call-card__line">
                &ldquo;Two margherita pizzas, garlic knots, pickup at 7:40.&rdquo;
              </p>
              <div className="roal-call-card__ticket">
                <span>Ticket sent</span>
                <strong>Kitchen can start now</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="roal-section roal-section--story" aria-labelledby="story-heading">
        <div className="home-wrap roal-story-layout">
          <div className="roal-section__copy public-reveal">
            <p className="roal-kicker">The rush-hour problem</p>
            <h2 id="story-heading">When your team is busiest, your phone still expects perfect service.</h2>
            <p>
              ROAL protects the moment most restaurants lose money: a guest calls,
              nobody can answer, and the order goes somewhere else.
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
        <div className="home-wrap">
          <div className="roal-section__copy roal-section__copy--center public-reveal">
            <p className="roal-kicker">How it works</p>
            <h2 id="steps-heading">Menu in. Phone connected. Orders out.</h2>
            <p>Simple enough for an owner to understand before the first demo call ends.</p>
          </div>

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
      </section>

      <section className="roal-section roal-section--ticket" aria-labelledby="ticket-heading">
        <div className="home-wrap roal-ticket-layout public-reveal">
          <div className="roal-section__copy">
            <p className="roal-kicker">What staff sees</p>
            <h2 id="ticket-heading">Not a transcript. A ticket.</h2>
            <p>
              The phone conversation becomes the exact information your team needs to
              cook, pack, and hand off the order.
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

      <section className="roal-section roal-section--pay" aria-labelledby="pay-heading">
        <div className="home-wrap roal-pay-panel public-reveal">
          <div className="roal-pay-panel__copy">
            <p className="roal-kicker">Pricing that feels fair</p>
            <h2 id="pay-heading">Only pay when ROAL creates a real order.</h2>
            <p>No charge for hangups, wrong numbers, or basic questions. If the call does not become revenue, it should not become a bill.</p>
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
              <h2 id="proof-heading">More orders without adding another person to the phone.</h2>
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

      <section className="roal-section roal-section--faq" aria-labelledby="faq-heading">
        <div className="home-wrap roal-faq-layout">
          <div className="roal-section__copy public-reveal">
            <p className="roal-kicker">Questions owners ask</p>
            <h2 id="faq-heading">Clear before you connect the line.</h2>
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
              <h2 id="final-heading">Hear the order your restaurant would have missed.</h2>
              <p>
                Bring your menu. Listen to ROAL answer. See the ticket. Then decide
                whether your phone should keep losing orders during rush hour.
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
