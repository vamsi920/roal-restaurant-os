"use client";

import { useCallback, useEffect, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { isPlatformAdminEmail } from "@/lib/auth/platform-admin";
import { canOperateRestaurant } from "@/lib/auth/roles";
import type { MembershipWithOrg } from "@/lib/auth/types";
import type { SerializedAuthContext } from "@/lib/auth/context-server";
import type { Membership, Organization, MembershipRole } from "@/lib/types";

type MembershipRow = Membership & {
  organization: Organization | Organization[] | null;
};

function normalizeMembership(row: MembershipRow): MembershipWithOrg | null {
  const org = Array.isArray(row.organization)
    ? row.organization[0]
    : row.organization;
  if (!org) return null;
  return {
    id: row.id,
    organization_id: row.organization_id,
    user_id: row.user_id,
    role: row.role,
    created_at: row.created_at,
    organization: org,
  };
}

export async function loadClientMemberships(): Promise<MembershipWithOrg[]> {
  const supabase = createBrowserSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("memberships")
    .select(
      `
      id,
      organization_id,
      user_id,
      role,
      created_at,
      organization:organizations (
        id,
        name,
        slug,
        created_at,
        updated_at
      )
    `
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? [])
    .map((row) => normalizeMembership(row as MembershipRow))
    .filter((m): m is MembershipWithOrg => m !== null);
}

export async function fetchAuthContextClient(): Promise<SerializedAuthContext | null> {
  const res = await fetch("/api/auth/context", { credentials: "include" });
  if (res.status === 401) return null;
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      typeof body.error === "string" ? body.error : "Failed to load auth context"
    );
  }
  return res.json() as Promise<SerializedAuthContext>;
}

export function membershipForOrg(
  memberships: MembershipWithOrg[],
  organizationId: string
): MembershipWithOrg | undefined {
  return memberships.find((m) => m.organization_id === organizationId);
}

export function canAccessRestaurantClient(
  memberships: MembershipWithOrg[],
  organizationId: string,
  role?: MembershipRole
): boolean {
  const m = membershipForOrg(memberships, organizationId);
  if (!m) return false;
  return canOperateRestaurant(role ?? m.role);
}

export function hasOrgAdminAccessClient(
  memberships: MembershipWithOrg[],
  userEmail?: string | null
): boolean {
  void memberships;
  return isPlatformAdminEmail(userEmail);
}

export function useAuthContext() {
  const [context, setContext] = useState<SerializedAuthContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAuthContextClient();
      setContext(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load session");
      setContext(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { context, loading, error, refresh };
}
