"use client";

import { useCallback, useEffect, useState } from "react";
import { isPlatformAdminEmail } from "@/lib/auth/platform-admin";
import { canOperateRestaurant } from "@/lib/auth/roles";
import type { MembershipWithOrg } from "@/lib/auth/types";
import type { SerializedAuthContext } from "@/lib/auth/context-server";
import type { MembershipRole } from "@/lib/types";

/** Memberships for the signed-in user, read from the session cookie by `GET /api/auth/context`. */
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
