import { redirect } from "next/navigation";
import { BillingDashboard } from "@/components/billing/BillingDashboard";
import { getAuthContext } from "@/lib/auth/context-server";
import { loadOrganizationBilling } from "@/lib/billing/load-billing";
import { getDb } from "@/lib/db";
import { confirmCheckoutSession } from "@/lib/billing/confirm-checkout";
import { getStripeClient } from "@/lib/billing/provider";

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

  return (
    <BillingDashboard
      snapshot={snapshot}
      justStarted={justStarted}
      checkoutCanceled={searchParams?.checkout === "canceled"}
    />
  );
}
