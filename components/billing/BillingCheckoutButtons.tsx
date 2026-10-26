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
  const [checkoutState, checkoutAction] = useFormState(startCheckoutAction, initial);
  const [portalState, portalAction] = useFormState(openBillingPortalAction, initial);

  const message =
    checkoutState.info ?? checkoutState.error ?? portalState.info ?? portalState.error;

  return (
    <div className="billing-dashboard__checkout mt-4 min-w-0 space-y-2">
      <div className="billing-dashboard__checkout-actions flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {snapshot.upgradePlanIds.map((planId) => {
          const plan = BILLING_PLANS[planId];
          return (
            <form key={planId} action={checkoutAction} className="w-full sm:w-auto">
              <input type="hidden" name="planId" value={planId} />
              <button
                type="submit"
                className="btn-primary kds-thumb-btn min-h-11 w-full sm:min-h-9 sm:w-auto"
              >
                Upgrade to {plan.name}
              </button>
            </form>
          );
        })}
        <form action={portalAction} className="w-full sm:w-auto">
          <button
            type="submit"
            className="btn-ghost kds-thumb-btn min-h-11 w-full sm:min-h-9 sm:w-auto"
          >
            Manage payment
          </button>
        </form>
      </div>
      {message ? (
        <p
          className="billing-dashboard__checkout-message text-[13px] text-muted [overflow-wrap:anywhere]"
          role="status"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
