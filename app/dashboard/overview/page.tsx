import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OrgOverviewDashboard } from "@/components/org-overview/OrgOverviewDashboard";
import { getAuthContext } from "@/lib/auth/context-server";
import { isOrgAdmin } from "@/lib/auth/roles";
import { loadOrgOverviewPage } from "@/lib/org-overview/load-org-overview";
import { createServerSupabase } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Operations overview — ROAL",
};

export const dynamic = "force-dynamic";

export default async function OrgOverviewPage() {
  const context = await getAuthContext();
  if (!context) {
    redirect("/login?next=/dashboard/overview");
  }

  const adminMemberships = context.memberships.filter((m) =>
    isOrgAdmin(m.role)
  );
  if (adminMemberships.length === 0) {
    redirect("/dashboard/restaurants");
  }

  const supabase = await createServerSupabase();
  const snapshot = await loadOrgOverviewPage(
    supabase,
    adminMemberships.map((m) => ({
      organizationId: m.organization_id,
      organizationName: m.organization.name,
      role: m.role,
    }))
  );

  return <OrgOverviewDashboard snapshot={snapshot} />;
}
