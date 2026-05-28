import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_PLATFORM_ADMIN_EMAIL,
  getPlatformAdminEmail,
  isPlatformAdminEmail,
} from "@/lib/auth/platform-admin";
import { hasOrgAdminAccess } from "@/lib/auth/context-server";
import type { AuthContext } from "@/lib/auth/types";

const ORG_A = "11111111-1111-4111-8111-111111111111";

afterEach(() => {
  delete process.env.PLATFORM_ADMIN_EMAIL;
});

describe("platform admin email", () => {
  it("defaults to vammu920@gmail.com", () => {
    expect(getPlatformAdminEmail()).toBe(DEFAULT_PLATFORM_ADMIN_EMAIL);
    expect(isPlatformAdminEmail("Vammu920@Gmail.com")).toBe(true);
  });

  it("respects PLATFORM_ADMIN_EMAIL override", () => {
    process.env.PLATFORM_ADMIN_EMAIL = "staff@example.com";
    expect(isPlatformAdminEmail("staff@example.com")).toBe(true);
    expect(isPlatformAdminEmail(DEFAULT_PLATFORM_ADMIN_EMAIL)).toBe(false);
  });
});

describe("hasOrgAdminAccess", () => {
  it("grants ops console only to platform admin email", () => {
    const platform: AuthContext = {
      user: { id: "u1", email: DEFAULT_PLATFORM_ADMIN_EMAIL } as AuthContext["user"],
      memberships: [
        {
          id: "m1",
          organization_id: ORG_A,
          user_id: "u1",
          role: "member",
          created_at: "2026-01-01T00:00:00.000Z",
          organization: {
            id: ORG_A,
            name: "Test Org",
            slug: "test",
            created_at: "2026-01-01T00:00:00.000Z",
            updated_at: "2026-01-01T00:00:00.000Z",
          },
        },
      ],
      primaryMembership: null,
    };

    const ownerOther: AuthContext = {
      ...platform,
      user: { id: "u2", email: "owner@restaurant.com" } as AuthContext["user"],
      memberships: [
        { ...platform.memberships[0]!, role: "owner", user_id: "u2" },
      ],
    };

    expect(hasOrgAdminAccess(platform)).toBe(true);
    expect(hasOrgAdminAccess(ownerOther)).toBe(false);
  });
});
