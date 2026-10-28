import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { ForwardingSetup } from "@/components/forwarding/forwarding-setup";
import { getAuthContext, getRestaurantAccessForPage } from "@/lib/auth/context-server";
import { getDb } from "@/lib/db";
import { loadForwardingSummary } from "@/lib/forwarding/state";
import { defaultAgentName } from "@/lib/trial/voices";
import { ensureRestaurantProfile } from "@/lib/restaurant-profile/helpers";

export const metadata: Metadata = { title: "Call forwarding — ROAL" };
export const dynamic = "force-dynamic";

/** Guided call-forwarding setup: phone type, when to forward, the exact code, and a live test call. */
export default async function ForwardingPage({ params }: { params: { id: string } }) {
  noStore();
  const access = await getRestaurantAccessForPage(params.id);
  if (!access) {
    const ctx = await getAuthContext();
    if (!ctx) redirect(`/login?next=/dashboard/restaurants/${params.id}/forwarding`);
    notFound();
  }
  const { restaurant } = access;
  const db = getDb();
  const [profile, summary] = await Promise.all([
    ensureRestaurantProfile(db, restaurant.id, restaurant.organization_id),
    loadForwardingSummary(db, restaurant.id),
  ]);
  const hostName = profile.agent_display_name?.trim() || defaultAgentName(profile.agent_voice_id);

  return (
    <div className="min-w-0 py-2 sm:py-6">
      <ForwardingSetup restaurantId={restaurant.id} restaurantName={restaurant.name} hostName={hostName} initial={summary} />
    </div>
  );
}
