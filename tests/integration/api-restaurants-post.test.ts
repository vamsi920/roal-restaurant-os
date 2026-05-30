import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/restaurants/route";

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const OTHER_ORG_ID = "00000000-0000-4000-8000-000000000099";
const USER_ID = "77777777-7777-4777-8777-777777777777";

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

vi.mock("@/lib/auth/context-server", () => ({
  requireAuthContext: vi.fn(),
  resolveOrganizationId: vi.fn(),
}));

vi.mock("@/lib/billing/assert-gate", () => ({
  assertOrganizationBillingGate: vi.fn(),
}));

vi.mock("@/lib/onboarding/helpers", () => ({
  ensureRestaurantOnboarding: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabase: vi.fn(),
}));

vi.mock("@/lib/voice-agent/provision-restaurant-voice-agent", () => ({
  tryProvisionVoiceAgentForNewRestaurant: vi.fn(),
}));

import {
  requireAuthContext,
  resolveOrganizationId,
} from "@/lib/auth/context-server";
import { assertOrganizationBillingGate } from "@/lib/billing/assert-gate";
import { createServerSupabase } from "@/lib/supabase/server";
import { tryProvisionVoiceAgentForNewRestaurant } from "@/lib/voice-agent/provision-restaurant-voice-agent";

describe("POST /api/restaurants", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(tryProvisionVoiceAgentForNewRestaurant).mockResolvedValue({
      ok: true,
      agent_id: "agent_auto_01",
      method: "duplicate",
    });
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(requireAuthContext).mockResolvedValue({
      context: null,
      errorResponse: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const res = await POST(
      new Request("http://localhost/api/restaurants", {
        method: "POST",
        body: JSON.stringify({ name: "Test" }),
      })
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when name missing", async () => {
    vi.mocked(requireAuthContext).mockResolvedValue({
      context: ownerContext(),
      errorResponse: null,
    });

    const res = await POST(
      new Request("http://localhost/api/restaurants", {
        method: "POST",
        body: JSON.stringify({ name: "  " }),
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 403 when user has no org membership", async () => {
    vi.mocked(requireAuthContext).mockResolvedValue({
      context: {
        user: { id: USER_ID, email: "a@b.com" },
        memberships: [],
        primaryMembership: null,
      },
      errorResponse: null,
    });
    vi.mocked(resolveOrganizationId).mockReturnValue({
      error: "No organization membership. Create an org and owner membership in Supabase, or complete onboarding.",
    });

    const res = await POST(
      new Request("http://localhost/api/restaurants", {
        method: "POST",
        body: JSON.stringify({ name: "New Place" }),
      })
    );
    expect(res.status).toBe(403);
  });

  it("returns 403 when resolved org is not a membership", async () => {
    vi.mocked(requireAuthContext).mockResolvedValue({
      context: ownerContext(),
      errorResponse: null,
    });
    vi.mocked(resolveOrganizationId).mockReturnValue({
      organizationId: OTHER_ORG_ID,
    });

    const res = await POST(
      new Request("http://localhost/api/restaurants", {
        method: "POST",
        body: JSON.stringify({ name: "New Place" }),
      })
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("Forbidden");
  });

  it("returns 402 when create_restaurant plan gate blocks", async () => {
    vi.mocked(requireAuthContext).mockResolvedValue({
      context: ownerContext(),
      errorResponse: null,
    });
    vi.mocked(resolveOrganizationId).mockReturnValue({ organizationId: ORG_ID });
    vi.mocked(assertOrganizationBillingGate).mockResolvedValue({
      ok: false,
      verdict: {
        action: "create_restaurant",
        level: "exceeded",
        allowed: false,
        hardBlocked: true,
        title: "Location limit reached",
        message: "Upgrade to add another restaurant.",
        limitKey: "active_locations",
        used: 1,
        projectedUsed: 2,
        limit: 1,
        unitLabel: "locations",
        showUpgrade: true,
        upgradeHref: "/dashboard/billing",
      },
    });

    const res = await POST(
      new Request("http://localhost/api/restaurants", {
        method: "POST",
        body: JSON.stringify({ name: "New Place" }),
      })
    );

    expect(res.status).toBe(402);
    const body = await res.json();
    expect(body.code).toBe("plan_limit_reached");
    expect(body.limit_key).toBe("active_locations");
  });

  it("returns sanitized 500 when insert fails", async () => {
    vi.mocked(requireAuthContext).mockResolvedValue({
      context: ownerContext(),
      errorResponse: null,
    });
    vi.mocked(resolveOrganizationId).mockReturnValue({ organizationId: ORG_ID });
    vi.mocked(assertOrganizationBillingGate).mockResolvedValue({
      ok: true,
      verdict: { hardBlocked: false, message: "" },
    } as never);

    const single = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'duplicate key value violates unique constraint "restaurants_slug_key"' },
    });
    const insert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({ single }),
    });
    vi.mocked(createServerSupabase).mockResolvedValue({
      from: vi.fn().mockReturnValue({ insert }),
    } as never);

    const res = await POST(
      new Request("http://localhost/api/restaurants", {
        method: "POST",
        body: JSON.stringify({ name: "New Place" }),
      })
    );

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Could not create restaurant. Try again.");
    expect(body.error).not.toMatch(/duplicate key|violates/i);
  });

  it("creates restaurant in resolved organization", async () => {
    const restaurant = {
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      name: "New Place",
      organization_id: ORG_ID,
      created_at: new Date().toISOString(),
    };

    vi.mocked(requireAuthContext).mockResolvedValue({
      context: ownerContext(),
      errorResponse: null,
    });
    vi.mocked(resolveOrganizationId).mockReturnValue({ organizationId: ORG_ID });
    vi.mocked(assertOrganizationBillingGate).mockResolvedValue({
      ok: true,
      verdict: { hardBlocked: false, message: "" },
    } as never);

    const single = vi.fn().mockResolvedValue({ data: restaurant, error: null });
    const insert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({ single }),
    });
    vi.mocked(createServerSupabase).mockResolvedValue({
      from: vi.fn().mockReturnValue({ insert }),
    } as never);

    const res = await POST(
      new Request("http://localhost/api/restaurants", {
        method: "POST",
        body: JSON.stringify({ name: "New Place" }),
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.restaurant.organization_id).toBe(ORG_ID);
    expect(body.voice_agent_provision).toEqual({
      ok: true,
      agent_id: "agent_auto_01",
      method: "duplicate",
    });
    expect(tryProvisionVoiceAgentForNewRestaurant).toHaveBeenCalledWith({
      restaurantId: restaurant.id,
      restaurantName: "New Place",
      organizationId: ORG_ID,
      userId: USER_ID,
    });
    expect(insert).toHaveBeenCalledWith({
      name: "New Place",
      organization_id: ORG_ID,
    });
  });

  it("returns 200 with warning when voice agent provision fails", async () => {
    const restaurant = {
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      name: "New Place",
      organization_id: ORG_ID,
      created_at: new Date().toISOString(),
    };

    vi.mocked(requireAuthContext).mockResolvedValue({
      context: ownerContext(),
      errorResponse: null,
    });
    vi.mocked(resolveOrganizationId).mockReturnValue({ organizationId: ORG_ID });
    vi.mocked(assertOrganizationBillingGate).mockResolvedValue({
      ok: true,
      verdict: { hardBlocked: false, message: "" },
    } as never);
    vi.mocked(tryProvisionVoiceAgentForNewRestaurant).mockResolvedValue({
      ok: false,
      warning: "ElevenLabs is temporarily unavailable.",
      phase: "provision",
      agent_id: null,
    });

    const single = vi.fn().mockResolvedValue({ data: restaurant, error: null });
    const insert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({ single }),
    });
    vi.mocked(createServerSupabase).mockResolvedValue({
      from: vi.fn().mockReturnValue({ insert }),
    } as never);

    const res = await POST(
      new Request("http://localhost/api/restaurants", {
        method: "POST",
        body: JSON.stringify({ name: "New Place" }),
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.restaurant.id).toBe(restaurant.id);
    expect(body.voice_agent_provision).toEqual({
      ok: false,
      warning: "ElevenLabs is temporarily unavailable.",
      phase: "provision",
      agent_id: null,
    });
  });
});
