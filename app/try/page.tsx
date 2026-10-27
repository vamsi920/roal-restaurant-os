import type { Metadata } from "next";
import { StartFunnel } from "@/components/start/start-funnel";
import { readPendingTrialFromCookie } from "@/lib/trial/auth";
import { toPublicView } from "@/lib/trial/store";

export const metadata: Metadata = {
  title: "Build your AI phone host — ROAL",
  description:
    "Paste your restaurant's website or Google Maps link. We read your menu and hours, build your AI phone host, and it calls you in about two minutes. No sign-up.",
  alternates: { canonical: "/try" },
};

export const dynamic = "force-dynamic";

/** `/try?q=<link>` — the public onboarding funnel the homepage input opens. */
export default async function TryPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = searchParams.q?.trim().slice(0, 500) || null;
  let initialTrial = null;
  if (!q) {
    try {
      const pending = await readPendingTrialFromCookie();
      if (pending && pending.status === "ready" && !pending.claimed_at) initialTrial = toPublicView(pending);
    } catch {
      initialTrial = null;
    }
  }
  return <StartFunnel mode="public" initialQuery={q} initialTrial={initialTrial} />;
}
