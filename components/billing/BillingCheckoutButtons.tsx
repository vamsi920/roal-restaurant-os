"use client";

import { useFormState } from "react-dom";
import { BILLING_PLANS } from "@/lib/billing";
import type { BillingSnapshot } from "@/lib/billing/types";
import {
  openBillingPortalAction,
  startCheckoutAction,
  type BillingActionState,
} from "@/app/dashboard/billing/actions";

type Props = {
  snapshot: BillingSnapshot;
};

const initial: BillingActionState = {};

export function BillingCheckoutButtons({ snapshot }: Props) {
  const [checkoutState, checkoutAction] = useFormState(
    startCheckoutAction,
    initial
  );
  const [portalState, portalAction] = useFormState(
    openBillingPortalAction,
    initial
  );

  const message =
    checkoutState.info ??
    checkoutState.error ??
    portalState.info ??
    portalState.error;

  return (
    <div className="mt-5 space-y-3">
      <div className="flex flex-wrap gap-2">
        {snapshot.upgradePlanIds.map((planId) => {
          const plan = BILLING_PLANS[planId];
          return (
            <form key={planId} action={checkoutAction}>
              <input type="hidden" name="planId" value={planId} />
              <button type="submit" className="btn-primary min-h-10 px-4 text-sm">
                Upgrade to {plan.name}
              </button>
            </form>
          );
        })}
        <form action={portalAction}>
          <button type="submit" className="btn-ghost min-h-10 px-4 text-sm">
            Manage payment
          </button>
        </form>
      </div>
      {message ? (
        <p className="text-sm text-muted" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
