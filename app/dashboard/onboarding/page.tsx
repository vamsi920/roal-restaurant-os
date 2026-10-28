import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ClaimTrialPanel } from "@/components/onboarding/claim-trial-panel";
import { MagicOnboarding } from "@/components/onboarding/magic-onboarding";
import { loadOnboardingWizardState } from "@/lib/onboarding/wizard-state.server";
import { readPendingTrialFromCookie } from "@/lib/trial/auth";
import { getDb } from "@/lib/db";
import { findExistingLocation, trialNeedsClaim } from "@/lib/trial/claim";
import { toPublicView } from "@/lib/trial/store";

export const metadata: Metadata = { title: "Set up your restaurant — ROAL" };

export const dynamic = "force-dynamic";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: { restaurant?: string; new?: string };
}) {
  const state = await loadOnboardingWizardState(searchParams.restaurant ?? null);
  if (!state) {
    redirect("/login?next=/dashboard/onboarding");
  }

  const addingLocation = searchParams.new === "1";
  // A leftover demo session for a restaurant that's already in this account is not pending work.
  let pendingTrial = await readPendingTrialFromCookie();
  const orgId = state.organization?.id ?? null;
  if (pendingTrial && orgId && (await findExistingLocation(getDb(), orgId, pendingTrial))) {
    pendingTrial = null;
  }

  // 1. Came from the homepage test call: finish setup automatically.
  if (
    !addingLocation &&
    trialNeedsClaim(pendingTrial) &&
    pendingTrial &&
    pendingTrial.status === "ready" &&
    pendingTrial.call_count > 0
  ) {
    return <ClaimTrialPanel trial={toPublicView(pendingTrial)} />;
  }

  // 2. No location yet, or adding another one (always starts fresh from a new link).
  if (state.restaurants.length === 0 || addingLocation) {
    const initialTrial =
      !addingLocation && pendingTrial && pendingTrial.status === "ready" ? toPublicView(pendingTrial) : null;
    return (
      <MagicOnboarding
        initialTrial={initialTrial}
        organizationName={state.organization?.name ?? null}
        canExit={state.restaurants.length > 0}
        addingLocation={addingLocation && state.restaurants.length > 0}
      />
    );
  }

  // 3. Existing location: the simple go-live checklist lives on its Overview.
  const target = state.activeRestaurant?.id ?? state.restaurants[0]?.id;
  redirect(target ? `/dashboard/restaurants/${target}/overview#go-live` : "/dashboard");
}
