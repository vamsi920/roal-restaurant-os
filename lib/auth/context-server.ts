import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { tryClaimLegacyPocMembership } from "@/lib/auth/claim-legacy-org";
import { ensureUserProfile } from "@/lib/auth/ensure-profile";
import { getSessionUser } from "@/lib/auth/session";
import {
  canOperateRestaurant,
  isOrgAdmin,
} from "@/lib/auth/roles";
import type { AuthContext, MembershipWithOrg, RestaurantAccess } from "@/lib/auth/types";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Membership, Organization, Restaurant } from "@/lib/types";

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

export async function loadUserMemberships(
  supabase: SupabaseClient,
  userId: string
): Promise<MembershipWithOrg[]> {
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
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? [])
    .map((row) => normalizeMembership(row as MembershipRow))
    .filter((m): m is MembershipWithOrg => m !== null);
}

export async function getAuthContext(): Promise<AuthContext | null> {
  const user = await getSessionUser();
  if (!user) return null;

  const supabase = await createServerSupabase();
  await ensureUserProfile(supabase, user);
  await tryClaimLegacyPocMembership(supabase, user.id);
  const memberships = await loadUserMemberships(supabase, user.id);

  return {
    user,
    memberships,
    primaryMembership: memberships[0] ?? null,
  };
}

export function hasOrgAdminAccess(context: AuthContext): boolean {
  return context.memberships.some((m) => isOrgAdmin(m.role));
}

export function findMembershipForOrg(
  context: AuthContext,
  organizationId: string
): MembershipWithOrg | undefined {
  return context.memberships.find((m) => m.organization_id === organizationId);
}

export function resolveOrganizationId(
  context: AuthContext,
  organizationId?: string | null
): { organizationId: string } | { error: string } {
  if (organizationId) {
    const membership = findMembershipForOrg(context, organizationId);
    if (!membership) {
      return { error: "You are not a member of that organization" };
    }
    if (!canOperateRestaurant(membership.role)) {
      return { error: "Insufficient permissions for this organization" };
    }
    return { organizationId };
  }

  const primary = context.primaryMembership;
  if (!primary) {
    return {
      error:
        "No organization membership. Create an org and owner membership in Supabase, or complete onboarding.",
    };
  }
  return { organizationId: primary.organization_id };
}

export async function requireAuthContext(): Promise<
  | { context: AuthContext; errorResponse: null }
  | { context: null; errorResponse: NextResponse }
> {
  const context = await getAuthContext();
  if (!context) {
    return {
      context: null,
      errorResponse: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { context, errorResponse: null };
}

export async function requireOrgAdminAccess(): Promise<
  | { context: AuthContext; errorResponse: null }
  | { context: null; errorResponse: NextResponse }
> {
  const auth = await requireAuthContext();
  if (auth.errorResponse) return auth;

  if (!hasOrgAdminAccess(auth.context)) {
    return {
      context: null,
      errorResponse: NextResponse.json(
        { error: "Admin or owner role required" },
        { status: 403 }
      ),
    };
  }
  return auth;
}

export async function requireRestaurantAccess(
  restaurantId: string,
  options?: { requireAdmin?: boolean }
): Promise<
  | { access: RestaurantAccess; context: AuthContext; errorResponse: null }
  | { access: null; context: AuthContext | null; errorResponse: NextResponse }
> {
  const auth = await requireAuthContext();
  if (auth.errorResponse) {
    return { access: null, context: null, errorResponse: auth.errorResponse };
  }

  const supabase = await createServerSupabase();
  const { data: restaurant, error } = await supabase
    .from("restaurants")
    .select("*")
    .eq("id", restaurantId)
    .maybeSingle<Restaurant>();

  if (error) {
    return {
      access: null,
      context: auth.context,
      errorResponse: NextResponse.json({ error: error.message }, { status: 500 }),
    };
  }

  if (!restaurant) {
    return {
      access: null,
      context: auth.context,
      errorResponse: NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 }
      ),
    };
  }

  const membership = findMembershipForOrg(
    auth.context,
    restaurant.organization_id
  );

  if (!membership || !canOperateRestaurant(membership.role)) {
    return {
      access: null,
      context: auth.context,
      errorResponse: NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      ),
    };
  }

  if (options?.requireAdmin && !isOrgAdmin(membership.role)) {
    return {
      access: null,
      context: auth.context,
      errorResponse: NextResponse.json(
        { error: "Admin or owner role required" },
        { status: 403 }
      ),
    };
  }

  return {
    access: {
      restaurant,
      membership,
      role: membership.role,
    },
    context: auth.context,
    errorResponse: null,
  };
}

/** JSON-safe auth context for client hooks / API. */
export function serializeAuthContext(context: AuthContext) {
  return {
    user: {
      id: context.user.id,
      email: context.user.email ?? null,
    },
    memberships: context.memberships.map((m) => ({
      id: m.id,
      organization_id: m.organization_id,
      role: m.role,
      organization: {
        id: m.organization.id,
        name: m.organization.name,
        slug: m.organization.slug,
      },
    })),
    primaryOrganizationId: context.primaryMembership?.organization_id ?? null,
    hasOrgAdminAccess: hasOrgAdminAccess(context),
  };
}

export type SerializedAuthContext = ReturnType<typeof serializeAuthContext>;

/** Server Components: returns access or null (caller should notFound). */
export async function getRestaurantAccessForPage(
  restaurantId: string
): Promise<(RestaurantAccess & { context: AuthContext }) | null> {
  const context = await getAuthContext();
  if (!context) return null;

  const supabase = await createServerSupabase();
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("*")
    .eq("id", restaurantId)
    .maybeSingle<Restaurant>();

  if (!restaurant) return null;

  const membership = findMembershipForOrg(context, restaurant.organization_id);
  if (!membership || !canOperateRestaurant(membership.role)) return null;

  return {
    restaurant,
    membership,
    role: membership.role,
    context,
  };
}
