import type { Metadata } from "next";
import { TrialBuilder } from "@/components/try/trial-builder";
import { readPendingTrialFromCookie } from "@/lib/trial/auth";
import { toPublicView } from "@/lib/trial/store";
import { SiteShell } from "@/components/landing/site-shell";
import { PRICING_RATE_AMOUNT } from "@/lib/landing/pricing-core";

export const metadata: Metadata = {
  title: "Try your AI phone host — ROAL",
  description:
    "Paste your restaurant website or Google Maps link and talk to your own AI phone host in about a minute. No sign-up.",
};

export const dynamic = "force-dynamic";

const TRUST = ["No sign-up", "Ready in about a minute", `${PRICING_RATE_AMOUNT} per completed order`] as const;

export default async function TryPage() {
  const pending = await readPendingTrialFromCookie();
  const initialTrial = pending && pending.status === "ready" ? toPublicView(pending) : null;
  return (
    <SiteShell>
      <section className="try-page hero" aria-labelledby="try-title">
        <div className="wrap hero__inner">
          <p className="pill">
            <span className="pill__dot" aria-hidden />
            Free · about a minute
          </p>
          <h1 id="try-title" className="hero__title !text-[clamp(2.25rem,6vw,4rem)]">
            Paste your restaurant.
            <br />
            Talk to your new phone host.
          </h1>
          <p className="hero__lead">
            We read your website or Google listing, learn your menu and hours, and put an AI host on the line
            you can call right now from your browser.
          </p>
          <div className="hero__builder">
            <TrialBuilder mode="public" initialTrial={initialTrial} embedded autofocus />
          </div>
          <ul className="hero__trust" aria-label="Quick facts">
            {TRUST.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
        </div>
      </section>
    </SiteShell>
  );
}
