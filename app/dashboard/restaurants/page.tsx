import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { getAuthContext } from "@/lib/auth/context-server";
import type { AuthContext } from "@/lib/auth/types";
import { getDb } from "@/lib/db";
import { loadLocationsForContext } from "@/lib/restaurant-list/load-locations";
import { LocationsList, LocationsLoadingState } from "./LocationsList";

export const metadata: Metadata = {
  title: "All locations — ROAL",
};

export const dynamic = "force-dynamic";

async function LocationsData({ context }: { context: AuthContext }) {
  const initial = await loadLocationsForContext(getDb(), context);
  return <LocationsList initial={initial} />;
}

/**
 * All locations: loaded on the server for the caller's organization memberships only
 * (lib/restaurant-list/load-locations), then kept fresh by LocationsList polling.
 */
export default async function RestaurantsPage() {
  noStore();
  const context = await getAuthContext();
  if (!context) redirect("/login?next=/dashboard/restaurants");

  return (
    <Suspense
      fallback={
        <div className="locations-page org-page org-page--wide min-w-0 space-y-5 overflow-x-clip">
          <LocationsLoadingState aria-busy="true" />
        </div>
      }
    >
      <LocationsData context={context} />
    </Suspense>
  );
}
