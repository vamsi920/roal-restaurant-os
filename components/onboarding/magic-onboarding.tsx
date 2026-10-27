"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import {
  claimTrialAction,
  startDashboardTrialAction,
} from "@/app/dashboard/onboarding/actions";
import { StartFunnel } from "@/components/start/start-funnel";
import type { TrialPublicView } from "@/lib/trial/types";

type Props = {
  initialTrial: TrialPublicView | null;
  organizationName: string | null;
  /** Adding another location: allow leaving back to the dashboard. */
  canExit?: boolean;
};

/** Signed-in first run: the same step-by-step funnel as /try; the last step claims in place. */
export function MagicOnboarding({ initialTrial, canExit = false }: Props) {
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
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <StartFunnel mode="dashboard" initialTrial={initialTrial} startTrial={startTrial} onClaim={onClaim} exitHref={canExit ? "/dashboard" : null} />
    </div>
  );
}
