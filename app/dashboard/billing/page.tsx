import { redirect } from "next/navigation";
import { BillingDashboard } from "@/components/billing/BillingDashboard";
import { getAuthContext } from "@/lib/auth/context-server";
import { loadOrganizationBilling } from "@/lib/billing/load-billing";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const context = await getAuthContext();
  if (!context) redirect("/login?next=/dashboard/billing");

  const membership = context.primaryMembership;
  if (!membership) {
    redirect("/dashboard/onboarding");
  }

  const supabase = getDb();
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

  return <BillingDashboard snapshot={snapshot} />;
}
