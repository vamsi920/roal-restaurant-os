import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/context-server";
import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const context = await getAuthContext();
  if (!context) redirect("/login?next=/dashboard/settings");

  const orgId = context.primaryMembership?.organization_id;
  let firstRestaurantId: string | null = null;

  if (orgId) {
    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("restaurants")
      .select("id")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    firstRestaurantId = data?.id ?? null;
  }

  return (
    <div className="settings-page dashboard-page dashboard-page--narrow min-w-0 max-w-full space-y-6 overflow-x-hidden sm:space-y-8">
      <header className="dashboard-page__header min-w-0">
        <p className="dashboard-page__eyebrow">Settings</p>
        <h1 className="dashboard-page__title">Organization</h1>
        <p className="dashboard-page__lead">
          Store profile, taxes, and ordering options live per location in Live orders
          and Menu &amp; agent.
        </p>
      </header>

      <div className="dashboard-page__actions dashboard-page__actions--row">
        {firstRestaurantId ? (
          <Link
            href={`/dashboard/restaurants/${firstRestaurantId}`}
            className="btn-primary inline-flex"
          >
            Open location
          </Link>
        ) : (
          <Link href="/dashboard/onboarding" className="btn-primary inline-flex">
            Start setup
          </Link>
        )}
        <Link
          href="/dashboard/settings/notifications"
          className="btn-ghost inline-flex"
        >
          Notifications
        </Link>
        <Link href="/dashboard/restaurants" className="btn-ghost inline-flex">
          All locations
        </Link>
      </div>
    </div>
  );
}
