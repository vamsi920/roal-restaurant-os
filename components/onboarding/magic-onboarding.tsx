"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import {
  claimTrialAction,
  startDashboardTrialAction,
} from "@/app/dashboard/onboarding/actions";
import { TrialBuilder } from "@/components/try/trial-builder";
import { Badge } from "@/components/ui";
import type { TrialPublicView } from "@/lib/trial/types";

type Props = {
  initialTrial: TrialPublicView | null;
  organizationName: string | null;
};

/** Signed-in first-run: same link-to-call builder as the homepage, claim finishes in place. */
export function MagicOnboarding({ initialTrial, organizationName }: Props) {
  const router = useRouter();

  const startTrial = useCallback(async (input: string) => {
    const { trial } = await startDashboardTrialAction({ input });
    return trial;
  }, []);

  const onClaim = useCallback(
    async (trialId: string) => {
      const result = await claimTrialAction({ trialId });
      router.replace(`/dashboard/restaurants/${result.restaurantId}/overview?welcome=1`);
    },
    [router]
  );

  return (
    <div className="mx-auto w-full min-w-0 max-w-5xl">
      <header className="mb-4 flex flex-col items-center text-center">
        <Badge tone="new" className="max-w-full">
          <span className="truncate">
            {organizationName ? `Add a location to ${organizationName}` : "Welcome to ROAL"}
          </span>
        </Badge>
      </header>
      <TrialBuilder mode="dashboard" initialTrial={initialTrial} startTrial={startTrial} onClaim={onClaim} autofocus />
    </div>
  );
}
