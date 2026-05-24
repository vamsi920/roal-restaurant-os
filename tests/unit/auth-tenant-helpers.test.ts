import { describe, expect, it } from "vitest";
import {
  findMembershipForOrg,
  hasOrgAdminAccess,
  resolveOrganizationId,
  serializeAuthContext,
} from "@/lib/auth/context-server";
import type { AuthContext, MembershipWithOrg } from "@/lib/auth/types";

const ORG_A = "11111111-1111-4111-8111-111111111111";
const ORG_B = "22222222-2222-4222-8222-222222222222";
const USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function membership(
  orgId: string,
  role: MembershipWithOrg["role"]
): MembershipWithOrg {
  return {
    id: `mem-${orgId.slice(0, 8)}`,
    organization_id: orgId,
    user_id: USER_ID,
    role,
    created_at: "2026-01-01T00:00:00.000Z",
    organization: {
      id: orgId,
      name: `Org ${orgId.slice(0, 4)}`,
      slug: `org-${orgId.slice(0, 4)}`,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    },
  };
}

function context(overrides?: Partial<AuthContext>): AuthContext {
  const memberships = [
    membership(ORG_A, "owner"),
    membership(ORG_B, "member"),
  ];
  return {
    user: { id: USER_ID, email: "op@example.invalid" } as AuthContext["user"],
    memberships,
    primaryMembership: memberships[0] ?? null,
    ...overrides,
  };
}

describe("resolveOrganizationId", () => {
  it("returns explicit org when user is a member with operate permission", () => {
    const result = resolveOrganizationId(context(), ORG_B);
    expect(result).toEqual({ organizationId: ORG_B });
  });

  it("rejects org the user does not belong to", () => {
    const result = resolveOrganizationId(
      context(),
      "99999999-9999-4999-8999-999999999999"
    );
    expect(result).toEqual({
      error: "You are not a member of that organization",
    });
  });

  it("falls back to primary membership when org omitted", () => {
    const result = resolveOrganizationId(context());
    expect(result).toEqual({ organizationId: ORG_A });
  });

  it("errors when user has no memberships", () => {
    const result = resolveOrganizationId({
      ...context(),
      memberships: [],
      primaryMembership: null,
    });
    expect(result.error).toMatch(/No organization membership/);
  });
});

describe("hasOrgAdminAccess / serializeAuthContext", () => {
  it("flags admin access when any membership is owner or admin", () => {
    expect(hasOrgAdminAccess(context())).toBe(true);
    const serialized = serializeAuthContext(context());
    expect(serialized.hasOrgAdminAccess).toBe(true);
    expect(serialized.primaryOrganizationId).toBe(ORG_A);
    expect(serialized.memberships).toHaveLength(2);
    expect(serialized.user.email).toBe("op@example.invalid");
  });

  it("omits admin flag for member-only orgs", () => {
    const memberOnly = context({
      memberships: [membership(ORG_B, "member")],
      primaryMembership: membership(ORG_B, "member"),
    });
    expect(hasOrgAdminAccess(memberOnly)).toBe(false);
    expect(serializeAuthContext(memberOnly).hasOrgAdminAccess).toBe(false);
  });
});

describe("findMembershipForOrg", () => {
  it("returns membership for tenant org id", () => {
    const m = findMembershipForOrg(context(), ORG_B);
    expect(m?.role).toBe("member");
    expect(m?.organization_id).toBe(ORG_B);
  });
});
