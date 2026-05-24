import { redirect } from "next/navigation";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { loadOnboardingWizardState } from "@/lib/onboarding/wizard-state.server";

export const dynamic = "force-dynamic";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: { restaurant?: string };
}) {
  const state = await loadOnboardingWizardState(searchParams.restaurant ?? null);
  if (!state) {
    redirect("/login?next=/dashboard/onboarding");
  }

  return (
    <OnboardingWizard
      key={`${state.activeRestaurant?.id ?? "none"}-${state.activeStep}`}
      initialState={state}
    />
  );
}
