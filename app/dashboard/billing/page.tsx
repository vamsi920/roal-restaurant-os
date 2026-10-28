import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BillingDashboard } from "@/components/billing/BillingDashboard";
import { getAuthContext } from "@/lib/auth/context-server";
import { loadOrganizationBilling } from "@/lib/billing/load-billing";
import { getDb } from "@/lib/db";
import { confirmCheckoutSession } from "@/lib/billing/confirm-checkout";
import { getStripeClient } from "@/lib/billing/provider";
import { loadOrganizationInvoices } from "@/lib/billing/invoices";

export const metadata: Metadata = { title: "Billing — ROAL" };

export const dynamic = "force-dynamic";

export default async function BillingPage({
  searchParams,
}: {
  searchParams?: { checkout?: string; session_id?: string };
}) {
  const context = await getAuthContext();
  if (!context) redirect("/login?next=/dashboard/billing");

  const membership = context.primaryMembership;
  if (!membership) {
    redirect("/dashboard/onboarding");
  }

  const supabase = getDb();

  const justStarted = searchParams?.checkout === "success";
  const stripe = justStarted && searchParams?.session_id ? getStripeClient() : null;
  if (stripe && searchParams?.session_id) {
    await confirmCheckoutSession(supabase, stripe, {
      sessionId: searchParams.session_id,
      organizationId: membership.organization_id,
    });
  }
  const { data: accessibleRestaurants } = await supabase
    .from("restaurants")
    .select("id")
    .eq("organization_id", membership.organization_id);

  const snapshot = await loadOrganizationBilling(supabase, {
    organizationId: membership.organization_id,
    membershipRole: membership.role,
    accessibleRestaurantIds: (accessibleRestaurants ?? []).map((row) => row.id),
  });

  if (!snapshot) {
    redirect("/dashboard/onboarding");
  }

  const { data: billingIds } = await supabase
    .from("organizations")
    .select("stripe_customer_id, stripe_subscription_id")
    .eq("id", membership.organization_id)
    .maybeSingle<{ stripe_customer_id: string | null; stripe_subscription_id: string | null }>();
  const billingHistory = await loadOrganizationInvoices(
    billingIds?.stripe_customer_id ? getStripeClient() : null,
    billingIds ?? { stripe_customer_id: null, stripe_subscription_id: null }
  );

  return (
    <BillingDashboard
      snapshot={snapshot}
      billingHistory={billingHistory}
      justStarted={justStarted}
      checkoutCanceled={searchParams?.checkout === "canceled"}
    />
  );
}
