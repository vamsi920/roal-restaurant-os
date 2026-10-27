import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import "@/app/dashboard-theme.css";
import { PRIVATE_PAGE_ROBOTS } from "@/lib/seo/robots-metadata";
import { AppShell } from "@/components/dashboard/app-shell";
import { getAuthContext } from "@/lib/auth/context-server";
import { isPlatformAdminEmail } from "@/lib/auth/platform-admin";
import { formatMembershipRole, isOrgAdmin } from "@/lib/auth/roles";
import { LAST_RESTAURANT_COOKIE } from "@/lib/dashboard-nav";
import { loadShellLocations } from "@/lib/dashboard/shell-data";
import { getDb } from "@/lib/db";

export const metadata: Metadata = {
  title: "Dashboard — ROAL",
  robots: PRIVATE_PAGE_ROBOTS,
};

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const context = await getAuthContext();
  if (!context) {
    redirect("/login?next=/dashboard");
  }

  const primary = context.primaryMembership;
  const supabase = getDb();
  const locations = await loadShellLocations(
    supabase,
    context.memberships.map((m) => ({ id: m.organization.id, name: m.organization.name }))
  );
  const lastRestaurantId = cookies().get(LAST_RESTAURANT_COOKIE)?.value ?? null;
  const metadataName = context.user.user_metadata?.full_name;

  return (
    <AppShell
      userEmail={context.user.email ?? context.user.id}
      userName={typeof metadataName === "string" ? metadataName : null}
      organizationName={primary?.organization.name ?? null}
      roleLabel={
        isPlatformAdminEmail(context.user.email)
          ? "ROAL support"
          : primary
            ? formatMembershipRole(primary.role)
            : null
      }
      locations={locations}
      lastRestaurantId={lastRestaurantId}
      showAdminNav={isPlatformAdminEmail(context.user.email)}
      showOrgAdminNav={Boolean(primary && isOrgAdmin(primary.role))}
    >
      {children}
    </AppShell>
  );
}
