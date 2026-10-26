import { redirect } from "next/navigation";
import { ClaimTrialPanel } from "@/components/onboarding/claim-trial-panel";
import { MagicOnboarding } from "@/components/onboarding/magic-onboarding";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { loadOnboardingWizardState } from "@/lib/onboarding/wizard-state.server";
import { readPendingTrialFromCookie } from "@/lib/trial/auth";
import { trialNeedsClaim } from "@/lib/trial/claim";
import { toPublicView } from "@/lib/trial/store";

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

  const pendingTrial = await readPendingTrialFromCookie();

  // 1. Came from the homepage test call: finish setup automatically.
  if (trialNeedsClaim(pendingTrial) && pendingTrial && pendingTrial.status === "ready" && pendingTrial.call_count > 0) {
    return <ClaimTrialPanel trial={toPublicView(pendingTrial)} />;
  }

  // 2. No location yet (or explicitly adding one): the magic builder.
  if (state.restaurants.length === 0 || searchParams.new === "1") {
    const initialTrial =
      pendingTrial && pendingTrial.status === "ready" ? toPublicView(pendingTrial) : null;
    return (
      <MagicOnboarding initialTrial={initialTrial} organizationName={state.organization?.name ?? null} />
    );
  }

  // 3. Existing location: launch checklist (go live).
  return (
    <OnboardingWizard
      key={`${state.activeRestaurant?.id ?? "none"}-${state.activeStep}`}
      initialState={state}
    />
  );
}
