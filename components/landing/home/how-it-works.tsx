"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";

type Step = {
  id: string;
  title: string;
  body: string;
  visual: ReactNode;
};

const STEPS: Step[] = [
  {
    id: "paste",
    title: "Paste your link",
    body: "Your website, your Google Maps listing, or just the restaurant name and city. That is the whole form.",
    visual: <PasteVisual />,
  },
  {
    id: "learn",
    title: "Your host learns the menu and hours",
    body: "ROAL reads your public pages, pulls items and prices, picks up your hours and address, and builds a host that sounds like it works there.",
    visual: <LearnVisual />,
  },
  {
    id: "call",
    title: "Test-call it in your browser",
    body: "Order something. Ask what time you close. Change your mind halfway. Pick the voice and the name you want it to use.",
    visual: <CallVisual />,
  },
  {
    id: "forward",
    title: "Forward your number",
    body: "Claim the host, get a dedicated line, and forward your restaurant number to it from your phone carrier whenever you are ready.",
    visual: <ForwardVisual />,
  },
  {
    id: "ticket",
    title: "Tickets land on the kitchen screen",
    body: "When a caller confirms name, phone, and items, the ticket shows up on your kitchen screen. That is the moment you pay for.",
    visual: <TicketVisual />,
  },
];

export function HowItWorks() {
  const [active, setActive] = useState(0);
  const stepRefs = useRef<Array<HTMLLIElement | null>>([]);

  useEffect(() => {
    const nodes = stepRefs.current.filter((n): n is HTMLLIElement => Boolean(n));
    if (!nodes.length || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const idx = nodes.indexOf(visible.target as HTMLLIElement);
        if (idx >= 0) setActive(idx);
      },
      { rootMargin: "-35% 0px -45% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, []);

  return (
    <section className="section how" id="how" aria-labelledby="how-title">
      <div className="wrap">
        <div className="how__head reveal">
          <p className="eyebrow">How it works</p>
          <h2 id="how-title" className="h2 mt-3">
            From a link to a live phone line, in five steps.
          </h2>
          <p className="lead mt-4">
            Nothing to install. No menu spreadsheet to fill in. Start with the link you already have.
          </p>
        </div>

        <div className="how__grid">
          <div className="how__stage" aria-hidden>
            <div className="how__canvas">
              {STEPS.map((step, i) => (
                <div key={step.id} className="how__scene" data-active={i === active ? "true" : "false"}>
                  {step.visual}
                </div>
              ))}
            </div>
          </div>

          <ol className="how__steps">
            {STEPS.map((step, i) => (
              <li
                key={step.id}
                ref={(el) => {
                  stepRefs.current[i] = el;
                }}
                className="how__step"
                data-active={i === active ? "true" : "false"}
              >
                <span className="how__num" aria-hidden>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <h3 className="how__step-title">{step.title}</h3>
                  <p className="how__step-body">{step.body}</p>
                </div>
                <div className="how__step-visual" aria-hidden>
                  {step.visual}
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-10 flex flex-wrap gap-3 reveal">
          <Link href="/try" className="btn-primary btn-lg">
            Build my phone host
          </Link>
          <Link href="/pricing" className="btn-ghost btn-lg">
            See pricing
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------- */
/* Visual mocks. Everything shown is illustrative sample data.             */
/* ---------------------------------------------------------------------- */

function PasteVisual() {
  return (
    <div className="mock">
      <div className="mock__bar">
        <span className="mock__dot" />
        <span className="mock__dot" />
        <span className="mock__dot" />
        <span className="ml-1">roal · try</span>
      </div>
      <div className="mock__body">
        <div className="mock__input">
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-subtle" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
            <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
          </svg>
          <span>bluemooncafe.com</span>
          <span className="mock__caret" />
        </div>
        <span className="btn-primary btn-sm justify-self-end">Build my phone host</span>
      </div>
    </div>
  );
}

function LearnVisual() {
  return (
    <div className="mock">
      <div className="mock__bar">
        <span className="mock__tag">
          <span className="pulse-dot" /> Menu read
        </span>
        <span className="ml-auto">Hours found</span>
      </div>
      <div className="mock__body">
        <div className="mock__row">
          <strong>Margherita pizza</strong>
          <span>14.00</span>
        </div>
        <div className="mock__row">
          <strong>Chicken shawarma plate</strong>
          <span>16.50</span>
        </div>
        <div className="mock__row">
          <strong>House salad</strong>
          <span>9.00</span>
        </div>
        <div className="mock__row">
          <strong>Hours</strong>
          <span>Tue–Sun · 11:00–22:00</span>
        </div>
      </div>
    </div>
  );
}

function CallVisual() {
  return (
    <div className="mock">
      <div className="mock__bar">
        <span className="mock__tag">
          <span className="pulse-dot" /> Live
        </span>
        <span className="ml-auto">00:14</span>
      </div>
      <div className="mock__body">
        <div className="mock__pulse">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" />
            <path d="M19 11a7 7 0 0 1-14 0M12 18v3" />
          </svg>
        </div>
        <div className="mock__wave">
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
        <p className="text-center text-muted">&ldquo;Thanks for calling Blue Moon Cafe, this is Maya. Pickup order?&rdquo;</p>
      </div>
    </div>
  );
}

function ForwardVisual() {
  return (
    <div className="mock">
      <div className="mock__bar">
        <span>Call forwarding</span>
        <span className="mock__tag ml-auto">On</span>
      </div>
      <div className="mock__body">
        <div className="mock__forward">
          <div className="mock__phone">
            <small>Your number</small>
            (555) 010-0199
          </div>
          <svg className="mock__arrow h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 12h13m-5-5 5 5-5 5" />
          </svg>
          <div className="mock__phone">
            <small>Your ROAL line</small>
            (555) 010-0420
          </div>
        </div>
        <p className="text-center text-xs text-subtle">Flip it back any time from your carrier.</p>
      </div>
    </div>
  );
}

function TicketVisual() {
  return (
    <div className="mock mock--ticket">
      <div className="mock__body">
        <div className="text-center">
          <strong>PICKUP · #0418</strong>
          <div className="text-xs text-muted">Ready in 20 min</div>
        </div>
        <div className="mock__row">
          <span>1× Margherita pizza</span>
          <span>14.00</span>
        </div>
        <div className="mock__row">
          <span>1× House salad</span>
          <span>9.00</span>
        </div>
        <div className="mock__row">
          <strong>Total</strong>
          <strong>23.00</strong>
        </div>
        <div className="text-xs text-muted">Sam · (555) 010-0177</div>
      </div>
    </div>
  );
}
