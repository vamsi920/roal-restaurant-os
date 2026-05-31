import { redirect } from "next/navigation";
import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard";
import { getAuthContext } from "@/lib/auth/context-server";
import { loadOrganizationAnalytics } from "@/lib/analytics/load-analytics";
import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: { range?: string };
}) {
  const context = await getAuthContext();
  if (!context) redirect("/login?next=/dashboard/analytics");

  const membership = context.primaryMembership;
  if (!membership) redirect("/dashboard/onboarding");

  const supabase = await createServerSupabase();
  const { data: accessibleRestaurants } = await supabase
    .from("restaurants")
    .select("id")
    .eq("organization_id", membership.organization_id);

  const snapshot = await loadOrganizationAnalytics(supabase, {
    organizationId: membership.organization_id,
    organizationName: membership.organization.name,
    accessibleRestaurantIds: (accessibleRestaurants ?? []).map((row) => row.id),
    rangeKey: searchParams.range,
  });

  return <AnalyticsDashboard snapshot={snapshot} />;
}
