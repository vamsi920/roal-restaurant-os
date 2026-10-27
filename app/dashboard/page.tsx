import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/context-server";
import { LAST_RESTAURANT_COOKIE } from "@/lib/dashboard-nav";
import { getDb } from "@/lib/db";

/**
 * Dashboard home: open the last-used (`roal_last_restaurant` cookie) or first
 * location's Overview.
 * No locations yet → onboarding.
 */
export default async function DashboardHomePage() {
  const context = await getAuthContext();
  if (!context) {
    redirect("/login?next=/dashboard");
  }

  const orgIds = context.memberships.map((m) => m.organization_id);
  let restaurantIds: string[] = [];
  if (orgIds.length > 0) {
    const supabase = getDb();
    const { data } = await supabase
      .from("restaurants")
      .select("id")
      .in("organization_id", orgIds)
      .order("created_at", { ascending: true });
    restaurantIds = (data ?? []).map((row) => row.id as string);
  }

  if (restaurantIds.length === 0) {
    redirect("/dashboard/onboarding");
  }

  const lastUsed = cookies().get(LAST_RESTAURANT_COOKIE)?.value;
  const target = lastUsed && restaurantIds.includes(lastUsed) ? lastUsed : restaurantIds[0];
  redirect(`/dashboard/restaurants/${target}/overview`);
}
