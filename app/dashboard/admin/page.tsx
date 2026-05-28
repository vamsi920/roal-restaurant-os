import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminOpsDashboard } from "@/components/admin/AdminOpsDashboard";
import {
  adminSnapshotSupabase,
  resolveAdminOrgInputs,
} from "@/lib/admin/resolve-admin-org-inputs";
import { loadAdminOpsSnapshot } from "@/lib/admin/load-ops-snapshot";
import { getAuthContext, hasOrgAdminAccess } from "@/lib/auth/context-server";
import { createServerSupabase } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Platform support — ROAL",
};

export const dynamic = "force-dynamic";

export default async function AdminOpsPage() {
  const context = await getAuthContext();
  if (!context) {
    redirect("/login?next=/dashboard/admin");
  }
  if (!hasOrgAdminAccess(context)) {
    redirect("/dashboard");
  }

  const adminOrgs = await resolveAdminOrgInputs(context);
  const sessionClient = await createServerSupabase();
  const supabase = adminSnapshotSupabase(context, sessionClient);
  const snapshot = await loadAdminOpsSnapshot(supabase, adminOrgs);

  return <AdminOpsDashboard snapshot={snapshot} />;
}
