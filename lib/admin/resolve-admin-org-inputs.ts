import type { SupabaseClient } from "@supabase/supabase-js";
import { isPlatformAdminEmail } from "@/lib/auth/platform-admin";
import { isOrgAdmin } from "@/lib/auth/roles";
import type { AuthContext } from "@/lib/auth/types";
import type { MembershipRole } from "@/lib/types";
import { getServiceRoleSupabase } from "@/lib/supabase/server";

export type AdminOrgInput = {
  organizationId: string;
  organizationName: string;
  role: MembershipRole;
};

/** Orgs shown on `/dashboard/admin` — all tenants for platform admin, else admin memberships only. */
export async function resolveAdminOrgInputs(
  context: AuthContext
): Promise<AdminOrgInput[]> {
  if (!isPlatformAdminEmail(context.user.email)) {
    return [];
  }

  const service = getServiceRoleSupabase();
  if (service) {
    const { data: orgs, error } = await service
      .from("organizations")
      .select("id, name")
      .order("name", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return (orgs ?? []).map((org) => ({
      organizationId: org.id as string,
      organizationName: (org.name as string) ?? "Organization",
      role: "owner" as MembershipRole,
    }));
  }

  return context.memberships
    .filter((m) => isOrgAdmin(m.role))
    .map((m) => ({
      organizationId: m.organization_id,
      organizationName: m.organization.name,
      role: m.role,
    }));
}

export function adminSnapshotSupabase(
  context: AuthContext,
  sessionClient: SupabaseClient
): SupabaseClient {
  if (isPlatformAdminEmail(context.user.email)) {
    return getServiceRoleSupabase() ?? sessionClient;
  }
  return sessionClient;
}
