"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/auth/context-server";
import { isOrgAdmin } from "@/lib/auth/roles";
import { billingProvider } from "@/lib/billing/provider";
import type { BillingPlanId } from "@/lib/billing/types";

export type BillingActionState = {
  error?: string;
  info?: string;
};

export async function startCheckoutAction(
  _prev: BillingActionState,
  formData: FormData
): Promise<BillingActionState> {
  const context = await getAuthContext();
  if (!context?.primaryMembership) {
    return { error: "Please sign in again." };
  }
  if (!isOrgAdmin(context.primaryMembership.role)) {
    return { error: "Only an account owner or admin can start the plan." };
  }

  const planId = (formData.get("planId") as BillingPlanId | null) ?? "starter";

  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "http://localhost:3000";
  const orgId = context.primaryMembership.organization_id;

  const result = await billingProvider.createCheckoutSession({
    organizationId: orgId,
    planId,
    successUrl: `${base}/dashboard/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${base}/dashboard/billing?checkout=canceled`,
  });

  if (!result.ok) {
    return { info: result.message };
  }

  redirect(result.url);
}

export async function openBillingPortalAction(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- useFormState signature
  _prev: BillingActionState,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- useFormState signature
  _formData: FormData
): Promise<BillingActionState> {
  const context = await getAuthContext();
  if (!context?.primaryMembership) {
    return { error: "Please sign in again." };
  }
  if (!isOrgAdmin(context.primaryMembership.role)) {
    return { error: "Only an account owner or admin can manage payment." };
  }

  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "http://localhost:3000";

  const result = await billingProvider.createPortalSession({
    organizationId: context.primaryMembership.organization_id,
    returnUrl: `${base}/dashboard/billing`,
  });

  if (!result.ok) {
    return { info: result.message };
  }

  redirect(result.url);
}

export async function revalidateBillingPage() {
  revalidatePath("/dashboard/billing");
}
