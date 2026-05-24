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
    <div className="mx-auto max-w-2xl min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-accent">
        Settings
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
        Organization settings
      </h1>
      <p className="mt-3 text-sm text-muted">
        Location profile, taxes, ordering modes, and escalation contacts are managed
        per restaurant in the kitchen workspace.
      </p>
      {firstRestaurantId ? (
        <Link
          href={`/dashboard/restaurants/${firstRestaurantId}`}
          className="btn-primary mt-6 inline-flex"
        >
          Open location settings
        </Link>
      ) : (
        <Link href="/dashboard/onboarding" className="btn-primary mt-6 inline-flex">
          Start onboarding
        </Link>
      )}
      <Link
        href="/dashboard/settings/notifications"
        className="btn-ghost mt-3 inline-flex"
      >
        Notification settings
      </Link>
      <Link
        href="/dashboard/restaurants"
        className="btn-ghost ml-0 mt-3 inline-flex sm:ml-3 sm:mt-3"
      >
        All restaurants
      </Link>
    </div>
  );
}
