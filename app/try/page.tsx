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

export default async function TryPage() {
  const pending = await readPendingTrialFromCookie();
  const initialTrial = pending && pending.status === "ready" ? toPublicView(pending) : null;
  return (
    <SiteShell>
      <section className="try-page hero" aria-labelledby="try-title">
        <div className="hero__glow" aria-hidden />
        <div className="wrap relative">
          <div className="try-page__head">
            <p className="chip chip--accent">Free · no sign-up · about a minute</p>
            <h1 id="try-title" className="h1">
              Paste your restaurant. Talk to your new phone host.
            </h1>
            <p className="lead">
              We read your website or Google listing, learn your menu and hours, and put an AI host on
              the line you can call right now. Keep it for {PRICING_RATE_AMOUNT} per completed order.
            </p>
          </div>
          <div className="hero__builder">
            <TrialBuilder mode="public" initialTrial={initialTrial} embedded autofocus />
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
