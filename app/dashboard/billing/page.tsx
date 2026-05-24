import { redirect } from "next/navigation";
import { BillingDashboard } from "@/components/billing/BillingDashboard";
import { getAuthContext } from "@/lib/auth/context-server";
import { loadOrganizationBilling } from "@/lib/billing/load-billing";
import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const context = await getAuthContext();
  if (!context) redirect("/login?next=/dashboard/billing");

  const membership = context.primaryMembership;
  if (!membership) {
    redirect("/dashboard/onboarding");
  }

  const supabase = await createServerSupabase();
  const snapshot = await loadOrganizationBilling(supabase, {
    organizationId: membership.organization_id,
    membershipRole: membership.role,
  });

  if (!snapshot) {
    redirect("/dashboard/onboarding");
  }

  return <BillingDashboard snapshot={snapshot} />;
}
