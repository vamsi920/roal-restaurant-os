import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/billing/gates/route";

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const USER_ID = "77777777-7777-4777-8777-777777777777";

vi.mock("@/lib/auth/context-server", () => ({
  requireAuthContext: vi.fn(),
  resolveOrganizationId: vi.fn(),
}));

vi.mock("@/lib/billing/assert-gate", () => ({
  loadOrganizationGateVerdicts: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabase: vi.fn(),
}));

import {
  requireAuthContext,
  resolveOrganizationId,
} from "@/lib/auth/context-server";
import { loadOrganizationGateVerdicts } from "@/lib/billing/assert-gate";
import { createServerSupabase } from "@/lib/supabase/server";

function ownerContext() {
  return {
    user: { id: USER_ID, email: "a@b.com" },
    memberships: [
      {
        id: "m1",
        organization_id: ORG_ID,
        user_id: USER_ID,
        role: "owner" as const,
        created_at: "",
        organization: {
          id: ORG_ID,
          name: "Org",
          slug: "org",
          created_at: "",
          updated_at: "",
        },
      },
    ],
    primaryMembership: null,
  };
}

const sampleGates = {
  menu_scan: {
    action: "menu_scan" as const,
    level: "ok" as const,
    allowed: true,
    hardBlocked: false,
    title: "Menu scans",
    message: "",
    limitKey: "menu_scans" as const,
    used: 0,
    projectedUsed: 1,
    limit: 40,
    unitLabel: "scans",
    showUpgrade: false,
    upgradeHref: "/dashboard/billing",
  },
  create_restaurant: {
    action: "create_restaurant" as const,
    level: "ok" as const,
    allowed: true,
    hardBlocked: false,
    title: "Active locations",
    message: "",
    limitKey: "active_locations" as const,
    used: 0,
    projectedUsed: 1,
    limit: 2,
    unitLabel: "locations",
    showUpgrade: false,
    upgradeHref: "/dashboard/billing",
  },
  voice_order: {
    action: "voice_order" as const,
    level: "ok" as const,
    allowed: true,
    hardBlocked: false,
    title: "Voice orders",
    message: "",
    limitKey: "voice_orders" as const,
    used: 0,
    projectedUsed: 1,
    limit: 150,
    unitLabel: "orders",
    showUpgrade: false,
    upgradeHref: "/dashboard/billing",
  },
};

describe("GET /api/billing/gates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createServerSupabase).mockResolvedValue({} as never);
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(requireAuthContext).mockResolvedValue({
      context: null,
      errorResponse: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const res = await GET(new Request("http://localhost/api/billing/gates"));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("returns gate verdicts for authed member", async () => {
    vi.mocked(requireAuthContext).mockResolvedValue({
      context: ownerContext(),
      errorResponse: null,
    });
    vi.mocked(resolveOrganizationId).mockReturnValue({ organizationId: ORG_ID });
    vi.mocked(loadOrganizationGateVerdicts).mockResolvedValue(sampleGates);

    const res = await GET(new Request("http://localhost/api/billing/gates"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.gates.create_restaurant.allowed).toBe(true);
    expect(loadOrganizationGateVerdicts).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        organizationId: ORG_ID,
        membershipRole: "owner",
      })
    );
  });

  it("returns 403 when org cannot be resolved", async () => {
    vi.mocked(requireAuthContext).mockResolvedValue({
      context: ownerContext(),
      errorResponse: null,
    });
    vi.mocked(resolveOrganizationId).mockReturnValue({
      error: "No organization membership.",
    });

    const res = await GET(new Request("http://localhost/api/billing/gates"));
    expect(res.status).toBe(403);
  });

  it("returns 404 when organization billing snapshot is missing", async () => {
    vi.mocked(requireAuthContext).mockResolvedValue({
      context: ownerContext(),
      errorResponse: null,
    });
    vi.mocked(resolveOrganizationId).mockReturnValue({ organizationId: ORG_ID });
    vi.mocked(loadOrganizationGateVerdicts).mockResolvedValue(null);

    const res = await GET(new Request("http://localhost/api/billing/gates"));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("Organization not found");
  });
});
