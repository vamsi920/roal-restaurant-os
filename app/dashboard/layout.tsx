import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import "@/app/dashboard-theme.css";
import { PRIVATE_PAGE_ROBOTS } from "@/lib/seo/robots-metadata";
import { AppShell } from "@/components/dashboard/app-shell";
import {
  getAuthContext,
  hasOrgAdminAccess,
} from "@/lib/auth/context-server";
import { formatMembershipRole } from "@/lib/auth/roles";

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

  return (
    <AppShell
      userEmail={context.user.email ?? context.user.id}
      organizationName={primary?.organization.name ?? null}
      roleLabel={primary ? formatMembershipRole(primary.role) : null}
      showAdminNav={hasOrgAdminAccess(context)}
    >
      {children}
    </AppShell>
  );
}
