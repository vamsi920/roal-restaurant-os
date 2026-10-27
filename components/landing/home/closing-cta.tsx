import { ArrowRight, Mail } from "lucide-react";
import { FocusTrialButton } from "@/components/landing/home/focus-trial-button";
import { buildPilotMailto } from "@/lib/landing/contact-mailto";
import { PRICING_RATE_AMOUNT } from "@/lib/landing/pricing-core";

/** Black closer. The primary button scrolls to and focuses the hero input (falls back to /try). */
export function ClosingCta() {
  return (
    <section className="closer" aria-labelledby="closer-title">
      <div className="wrap">
        <div className="closer__card reveal">
          <div className="closer__glow" aria-hidden />
          <h2 id="closer-title" className="closer__title">
            Hear your own phone host <span className="text-money">in a minute.</span>
          </h2>
          <p className="closer__lead">
            Paste your link, call it from your browser, keep it if you like it. {PRICING_RATE_AMOUNT} per
            completed order, nothing otherwise.
          </p>
          <div className="closer__actions">
            <FocusTrialButton className="closer__primary">
              Build my phone host <ArrowRight className="h-4 w-4" />
            </FocusTrialButton>
            <a href={buildPilotMailto({ subject: "ROAL — question from a restaurant" })} className="closer__secondary">
              <Mail className="h-4 w-4" /> Talk to us
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
