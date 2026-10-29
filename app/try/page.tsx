import type { Metadata } from "next";
import { StartFunnel } from "@/components/start/start-funnel";
import { JsonLd } from "@/components/seo/json-ld";
import { graph, organizationJsonLd, softwareJsonLd, webPageJsonLd } from "@/lib/seo/json-ld";
import { buildPublicPageMetadata } from "@/lib/seo/public-open-graph";
import { readPendingTrialFromCookie } from "@/lib/trial/auth";
import { toPublicView } from "@/lib/trial/store";

export const metadata: Metadata = buildPublicPageMetadata({
  title: "Try ROAL free: build your restaurant's AI phone host",
  description:
    "Paste your restaurant's website or Google Maps link. ROAL reads your menu and hours and builds an AI phone host you can call in about two minutes. No sign-up.",
  canonicalPath: "/try",
});

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
  return (
    <>
      <JsonLd
        data={graph(
          webPageJsonLd({ path: "/try", name: "Build your AI phone host", description: "Build a free test phone host from your restaurant link." }),
          organizationJsonLd(),
          softwareJsonLd()
        )}
      />
      <StartFunnel mode="public" initialQuery={q} initialTrial={initialTrial} />
    </>
  );
}
