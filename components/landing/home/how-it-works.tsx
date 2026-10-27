import Link from "next/link";
import { ArrowRight, Check, Link2, Mic, PhoneForwarded } from "lucide-react";
import { FocusTrialButton } from "@/components/landing/home/focus-trial-button";

/** Four steps from a link to a live line. Mini visuals are illustrative sample data. */

const STEPS = [
  {
    id: "paste",
    title: "Paste your link",
    body: "Your website, your Google Maps listing, or the restaurant name and city. That's the whole form.",
  },
  {
    id: "learn",
    title: "It learns your menu & hours",
    body: "ROAL reads your public pages, pulls items and prices, and picks up your hours and address.",
  },
  {
    id: "call",
    title: "Test-call it in your browser",
    body: "Order something. Ask when you close. Change your mind halfway. Pick the voice and the name.",
  },
  {
    id: "forward",
    title: "Forward your number",
    body: "Claim your host, get a dedicated line, and forward your restaurant number when you're ready.",
  },
] as const;

function StepVisual({ id }: { id: (typeof STEPS)[number]["id"] }) {
  if (id === "paste") {
    return (
      <div className="step-visual">
        <div className="step-visual__input">
          <Link2 className="h-3.5 w-3.5 shrink-0 text-subtle" />
          <span className="truncate">mariastrattoria.com</span>
          <span className="step-visual__go">
            <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </div>
    );
  }
  if (id === "learn") {
    return (
      <div className="step-visual">
        {[
          ["Menu", "48 items"],
          ["Hours", "Tue–Sun"],
          ["Address", "Found"],
        ].map(([k, v]) => (
          <div key={k} className="step-visual__row">
            <span className="step-visual__check">
              <Check className="h-2.5 w-2.5" strokeWidth={3} />
            </span>
            <span>{k}</span>
            <span className="ml-auto text-subtle">{v}</span>
          </div>
        ))}
      </div>
    );
  }
  if (id === "call") {
    return (
      <div className="step-visual step-visual--call">
        <span className="step-visual__orb">
          <Mic className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <p className="step-visual__name">Calling Sofia…</p>
          <div className="step-visual__wave">
            {Array.from({ length: 14 }).map((_, i) => (
              <i key={i} style={{ animationDelay: `${(i % 5) * 0.12}s` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="step-visual step-visual--forward">
      <div className="step-visual__row">
        <span className="text-subtle">Your number</span>
        <span className="step-visual__num">(555) 010-0199</span>
      </div>
      <div className="step-visual__row">
        <span className="inline-flex items-center gap-1.5 text-subtle">
          <PhoneForwarded className="h-3.5 w-3.5 text-accent" /> Forwards to
        </span>
        <span className="step-visual__num step-visual__num--ink">ROAL line</span>
      </div>
    </div>
  );
}

export function HowItWorks() {
  return (
    <section className="section" id="how" aria-labelledby="how-title">
      <div className="wrap">
        <div className="section-head reveal">
          <p className="pill">
            <span className="pill__dot" aria-hidden />
            How it works
          </p>
          <h2 id="how-title" className="h2 mt-5">
            <span className="tone-muted">From a link to a live phone line.</span> No forms, no spreadsheets.
          </h2>
        </div>

        <ol className="steps">
          {STEPS.map((step, i) => (
            <li key={step.id} className="step reveal">
              <span className="step__num">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="step__title">{step.title}</h3>
              <p className="step__body">{step.body}</p>
              <div className="step__visual" aria-hidden>
                <StepVisual id={step.id} />
              </div>
            </li>
          ))}
        </ol>

        <div className="section-cta reveal">
          <FocusTrialButton className="btn-primary btn-lg">
            Build my phone host <ArrowRight className="h-4 w-4" />
          </FocusTrialButton>
          <Link href="/pricing" className="btn-ghost btn-lg">
            See pricing
          </Link>
        </div>
      </div>
    </section>
  );
}
