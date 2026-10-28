"use client";

import { useFormState, useFormStatus } from "react-dom";
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

function SubmitButton({ children, pendingLabel, primary }: { children: string; pendingLabel: string; primary?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`${primary ? "btn-primary" : "btn-ghost"} kds-thumb-btn min-h-11 w-full sm:min-h-9 sm:w-auto`}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

/** One plan: $0.90 per completed order. Start it, or manage card and invoices once started. */
export function BillingCheckoutButtons({ snapshot }: Props) {
  const [checkoutState, checkoutAction] = useFormState(startCheckoutAction, initial);
  const [portalState, portalAction] = useFormState(openBillingPortalAction, initial);

  const message =
    checkoutState.info ?? checkoutState.error ?? portalState.info ?? portalState.error;
  const planActive = snapshot.subscriptionStatus === "active";

  return (
    <div className="billing-dashboard__checkout mt-4 min-w-0 space-y-2">
      <div className="billing-dashboard__checkout-actions flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {!planActive ? (
          <form action={checkoutAction} className="w-full sm:w-auto">
            <input type="hidden" name="planId" value="starter" />
            <SubmitButton primary pendingLabel="Opening payment…">
              Start my plan
            </SubmitButton>
          </form>
        ) : null}
        {snapshot.stripeCustomerLinked ? (
          <form action={portalAction} className="w-full sm:w-auto">
            <SubmitButton pendingLabel="Opening…">Payment & invoices</SubmitButton>
          </form>
        ) : null}
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
