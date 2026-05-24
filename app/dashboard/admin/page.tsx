import { redirect } from "next/navigation";
import { AdminOpsDashboard } from "@/components/admin/AdminOpsDashboard";
import { getAuthContext, hasOrgAdminAccess } from "@/lib/auth/context-server";
import { isOrgAdmin } from "@/lib/auth/roles";
import { loadAdminOpsSnapshot } from "@/lib/admin/load-ops-snapshot";
import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminOpsPage() {
  const context = await getAuthContext();
  if (!context) {
    redirect("/login?next=/dashboard/admin");
  }
  if (!hasOrgAdminAccess(context)) {
    redirect("/dashboard");
  }

  const adminOrgs = context.memberships
    .filter((m) => isOrgAdmin(m.role))
    .map((m) => ({
      organizationId: m.organization_id,
      organizationName: m.organization.name,
      role: m.role,
    }));

  const supabase = await createServerSupabase();
  const snapshot = await loadAdminOpsSnapshot(supabase, adminOrgs);

  return <AdminOpsDashboard snapshot={snapshot} />;
}
