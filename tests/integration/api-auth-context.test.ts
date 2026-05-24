import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/auth/context/route";
import type { AuthContext } from "@/lib/auth/types";

const ORG_A = "11111111-1111-4111-8111-111111111111";
const ORG_B = "22222222-2222-4222-8222-222222222222";

vi.mock("@/lib/auth/context-server", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/auth/context-server")>();
  return {
    ...actual,
    getAuthContext: vi.fn(),
  };
});

import { getAuthContext } from "@/lib/auth/context-server";

function buildContext(overrides?: Partial<AuthContext>): AuthContext {
  return {
    user: {
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      email: "operator@example.invalid",
    } as AuthContext["user"],
    memberships: [
      {
        id: "mem-owner",
        organization_id: ORG_A,
        user_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        role: "owner",
        created_at: "2026-01-01T00:00:00.000Z",
        organization: {
          id: ORG_A,
          name: "Org A",
          slug: "org-a",
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
        },
      },
      {
        id: "mem-member",
        organization_id: ORG_B,
        user_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        role: "member",
        created_at: "2026-01-02T00:00:00.000Z",
        organization: {
          id: ORG_B,
          name: "Org B",
          slug: "org-b",
          created_at: "2026-01-02T00:00:00.000Z",
          updated_at: "2026-01-02T00:00:00.000Z",
        },
      },
    ],
    primaryMembership: null,
    ...overrides,
  };
}

describe("GET /api/auth/context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 with error body when signed out", async () => {
    vi.mocked(getAuthContext).mockResolvedValue(null);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("returns serialized memberships and role-derived flags when signed in", async () => {
    const context = buildContext();
    context.primaryMembership = context.memberships[0] ?? null;
    vi.mocked(getAuthContext).mockResolvedValue(context);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.user).toEqual({
      id: context.user.id,
      email: "operator@example.invalid",
    });
    expect(body.memberships).toHaveLength(2);
    expect(body.memberships[0]).toEqual({
      id: "mem-owner",
      organization_id: ORG_A,
      role: "owner",
      organization: { id: ORG_A, name: "Org A", slug: "org-a" },
    });
    expect(body.memberships[1].role).toBe("member");
    expect(body.primaryOrganizationId).toBe(ORG_A);
    expect(body.hasOrgAdminAccess).toBe(true);
  });

  it("sets hasOrgAdminAccess false for member-only memberships", async () => {
    const memberOnly = buildContext({
      memberships: [
        {
          id: "mem-only",
          organization_id: ORG_B,
          user_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          role: "member",
          created_at: "2026-01-02T00:00:00.000Z",
          organization: {
            id: ORG_B,
            name: "Org B",
            slug: "org-b",
            created_at: "2026-01-02T00:00:00.000Z",
            updated_at: "2026-01-02T00:00:00.000Z",
          },
        },
      ],
      primaryMembership: null,
    });
    memberOnly.primaryMembership = memberOnly.memberships[0] ?? null;
    vi.mocked(getAuthContext).mockResolvedValue(memberOnly);

    const res = await GET();
    const body = await res.json();

    expect(body.hasOrgAdminAccess).toBe(false);
    expect(body.memberships[0].role).toBe("member");
  });

  it("omits sensitive fields from JSON", async () => {
    const context = buildContext();
    context.primaryMembership = context.memberships[0] ?? null;
    vi.mocked(getAuthContext).mockResolvedValue(context);

    const res = await GET();
    const raw = await res.text();

    expect(res.status).toBe(200);
    expect(raw).not.toMatch(/service_role/i);
    expect(raw).not.toMatch(/SUPABASE_SERVICE_ROLE/i);
    expect(raw).not.toContain("user_id");
    expect(raw).not.toMatch(/eyJ[a-zA-Z0-9_-]+\./);
    const body = JSON.parse(raw) as Record<string, unknown>;
    for (const m of body.memberships as Record<string, unknown>[]) {
      expect(m).not.toHaveProperty("created_at");
      expect(m).not.toHaveProperty("user_id");
      expect(m.organization).not.toHaveProperty("created_at");
      expect(m.organization).not.toHaveProperty("updated_at");
    }
    expect(body.user).not.toHaveProperty("app_metadata");
    expect(body.user).not.toHaveProperty("user_metadata");
  });
});
