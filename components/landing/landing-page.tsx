import Image from "next/image";
import Link from "next/link";
import { LandingHomeShell } from "./home/landing-home-shell";

const heroProof = [
  "Answers your restaurant phone",
  "Takes orders in the guest's language",
  "$0 for non-orders",
] as const;

const rushPain = [
  "The line rings while staff are cooking.",
  "A guest calls the next restaurant.",
  "The order is gone before you can call back.",
] as const;

const callFlow = [
  {
    step: "Call",
    title: "ROAL answers like a trained team member",
    body: "It greets the guest, understands the language, and keeps the call calm.",
  },
  {
    step: "Menu",
    title: "It sells from your live menu",
    body: "Items, modifiers, hours, sold-out dishes, pickup rules, and notes stay in sync.",
  },
  {
    step: "Ticket",
    title: "Your kitchen gets the order",
    body: "Name, items, notes, total, pickup time, and call evidence arrive in one clean ticket.",
  },
] as const;

const ownerMetrics = [
  {
    value: "0",
    label: "missed pickup calls during forwarded hours",
  },
  {
    value: "$0",
    label: "charged for hang-ups, questions, tests, or wrong numbers",
  },
  {
    value: "20m",
    label: "target setup for a first test call with your menu",
  },
] as const;

const ticketRows = [
  ["Guest", "Maria G."],
  ["Language", "Spanish + English"],
  ["Order", "2 pizzas, garlic knots"],
  ["Pickup", "22 minutes"],
] as const;

const faqs = [
  {
    question: "What problem does ROAL solve?",
    answer:
      "ROAL answers phone calls your team misses during busy service, takes pickup orders from your approved menu, and sends the kitchen a clean ticket.",
  },
  {
    question: "Does the customer know what to do?",
    answer:
      "Yes. The conversation follows a normal restaurant flow: greeting, menu help, order details, repeat-back, pickup time, and staff handoff when needed.",
  },
  {
    question: "What do I pay for?",
    answer:
      "Successful orders. ROAL is not built around per-minute phone fees, and non-order calls are not the value we charge for.",
  },
  {
    question: "Can my staff control it?",
    answer:
      "Yes. Your team controls the menu, hours, availability, pickup rules, and when your calls forward to ROAL.",
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

function PhoneIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
      <path
        d="M7.2 4.7 9 4.1c.7-.2 1.4.1 1.7.8l.8 2.1c.2.6.1 1.2-.4 1.6l-1 .9a8 8 0 0 0 4 4l.9-1c.4-.5 1-.6 1.6-.4l2.1.8c.7.3 1 1 .8 1.7l-.6 1.8c-.3.9-1.1 1.5-2 1.5C10.8 18 6 13.2 6 7.1c0-.9.5-1.7 1.2-2.4Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M15.8 5.2c1.2.4 2.2 1.4 2.6 2.6M16.4 2.2a8.2 8.2 0 0 1 5.4 5.4"
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
        <div className="roal-hero__shell public-reveal">
          <div className="roal-hero__copy">
            <p className="roal-kicker">AI phone ordering for busy restaurants</p>
            <h1 id="hero-heading" className="roal-hero__title">
              Missed call? ROAL takes the order before they call somewhere else.
            </h1>
            <p className="roal-hero__lead">
              ROAL answers your restaurant phone, speaks naturally in the
              customer&apos;s language, takes pickup orders from your live menu,
              and sends a clean ticket to the kitchen.
            </p>

            <div className="roal-hero__actions" aria-label="Primary actions">
              <Link href="/demo" className="roal-btn roal-btn--primary">
                Hear a real order
                <ArrowIcon />
              </Link>
              <Link href="/pricing" className="roal-btn roal-btn--quiet">
                $0.90 per successful order
              </Link>
            </div>

            <div className="roal-hero__proof" aria-label="ROAL promises">
              {heroProof.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </div>

          <div className="roal-hero__visual" aria-label="Live ROAL phone order preview">
            <Image
              src="/landing/hero-restaurant-counter.png"
              alt="Restaurant counter during rush hour while ROAL handles phone orders"
              width={1672}
              height={941}
              priority
              className="roal-hero__image"
            />

            <div className="roal-call-card">
              <div className="roal-call-card__top">
                <span>
                  <PhoneIcon />
                  Live call
                </span>
                <strong>00:48</strong>
              </div>
              <div className="roal-call-card__bubble roal-call-card__bubble--guest">
                <span>Guest</span>
                Hola, can I place a pickup order?
              </div>
              <div className="roal-call-card__bubble roal-call-card__bubble--agent">
                <span>ROAL</span>
                Claro. I have the menu open.
              </div>
              <div className="roal-call-card__ticket">
                <span>Kitchen ticket ready</span>
                <strong>2 Margherita + garlic knots</strong>
                <small>Only this successful order is billable.</small>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="roal-section roal-section--pain" aria-labelledby="pain-heading">
        <div className="home-wrap roal-pain">
          <div className="roal-section__intro public-reveal">
            <p className="roal-kicker">The rush-hour leak</p>
            <h2 id="pain-heading">Your phone is still a sales channel. It just needs backup.</h2>
          </div>

          <div className="roal-pain__stack public-reveal-stagger">
            {rushPain.map((item) => (
              <div key={item} className="roal-pain__line public-reveal-item">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="roal-section roal-section--flow" aria-labelledby="flow-heading">
        <div className="home-wrap">
          <div className="roal-section__intro roal-section__intro--center public-reveal">
            <p className="roal-kicker">How it works</p>
            <h2 id="flow-heading">One simple path: phone call to kitchen ticket.</h2>
            <p>
              No complicated restaurant management suite. ROAL focuses on the
              order-taking moment and makes it reliable.
            </p>
          </div>

          <ol className="roal-flow public-reveal-stagger">
            {callFlow.map((item) => (
              <li key={item.step} className="roal-flow__card public-reveal-item">
                <span>{item.step}</span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="roal-section roal-section--ticket" aria-labelledby="ticket-heading">
        <div className="home-wrap roal-ticket-story public-reveal">
          <div className="roal-ticket-story__copy">
            <p className="roal-kicker">What staff see</p>
            <h2 id="ticket-heading">Not another messy transcript. A makeable order.</h2>
            <p>
              The kitchen gets what matters first: guest name, language, order,
              notes, pickup time, total, and call evidence when someone wants to
              review it.
            </p>
          </div>

          <div className="roal-ticket">
            <div className="roal-ticket__head">
              <span>New phone order</span>
              <strong>#1273</strong>
            </div>
            {ticketRows.map(([label, value]) => (
              <div key={label} className="roal-ticket__row">
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="roal-section roal-section--pricing" aria-labelledby="pricing-heading">
        <div className="home-wrap roal-pricing public-reveal">
          <div>
            <p className="roal-kicker">Pricing that makes sense</p>
            <h2 id="pricing-heading">Pay for orders. Not phone noise.</h2>
            <p>
              If a call becomes a real pickup order, ROAL earns with you. If it
              is a question, hang-up, test, wrong number, or handoff, that is
              not the value we charge for.
            </p>
          </div>

          <div className="roal-price">
            <strong>$0.90</strong>
            <span>per successful order</span>
            <Link href="/pricing" className="roal-btn roal-btn--primary">
              See the plan
              <ArrowIcon />
            </Link>
          </div>
        </div>
      </section>

      <section className="roal-section roal-section--metrics" aria-labelledby="metrics-heading">
        <div className="home-wrap">
          <div className="roal-section__intro public-reveal">
            <p className="roal-kicker">Owner confidence</p>
            <h2 id="metrics-heading">Built around the numbers owners actually feel.</h2>
          </div>

          <div className="roal-metrics public-reveal-stagger">
            {ownerMetrics.map((metric) => (
              <article key={metric.value} className="roal-metric public-reveal-item">
                <strong>{metric.value}</strong>
                <span>{metric.label}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="roal-section roal-section--faq" aria-labelledby="faq-heading">
        <div className="home-wrap roal-faq">
          <div className="roal-section__intro public-reveal">
            <p className="roal-kicker">Owner FAQ</p>
            <h2 id="faq-heading">The hand-the-phone-over questions.</h2>
          </div>

          <div className="roal-faq__list public-reveal-stagger">
            {faqs.map((item) => (
              <details key={item.question} className="roal-faq__item public-reveal-item">
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="roal-section roal-section--final" aria-labelledby="final-heading">
        <div className="home-wrap">
          <div className="roal-final public-reveal">
            <Image
              src="/landing/final-cta-pizzeria.png"
              alt="Restaurant pickup counter ready for the next phone order"
              width={1956}
              height={804}
              className="roal-final__image"
            />
            <div className="roal-final__copy">
              <p className="roal-kicker">Start with one real call</p>
              <h2 id="final-heading">Let ROAL answer the next order your team cannot reach.</h2>
              <p>
                Test it with your menu, listen to the call, inspect the ticket,
                and go live only when it feels right.
              </p>
              <div className="roal-hero__actions">
                <Link href="/demo" className="roal-btn roal-btn--primary">
                  Hear the demo
                  <ArrowIcon />
                </Link>
                <Link href="/signup?next=/dashboard/restaurants" className="roal-btn roal-btn--quiet">
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
