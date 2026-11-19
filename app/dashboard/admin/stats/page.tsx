import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { GrowthStatsDashboard } from "@/components/admin/GrowthStatsDashboard";
import { loadGrowthStats } from "@/lib/admin/load-growth-stats";
import { getAuthContext, hasOrgAdminAccess } from "@/lib/auth/context-server";
import { getDb } from "@/lib/db";

export const metadata: Metadata = {
  title: "Growth stats — ROAL",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/** Owner-only growth stats (platform admin email, see lib/auth/platform-admin.ts). */
export default async function GrowthStatsPage() {
  const context = await getAuthContext();
  if (!context) {
    redirect("/login?next=/dashboard/admin/stats");
  }
  if (!hasOrgAdminAccess(context)) {
    redirect("/dashboard");
  }

  const stats = await loadGrowthStats(getDb());
  return <GrowthStatsDashboard stats={stats} />;
}
