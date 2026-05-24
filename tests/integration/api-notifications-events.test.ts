import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as postEvent } from "@/app/api/notifications/events/route";
import { POST as postCheckStuck } from "@/app/api/notifications/check-stuck/route";
import { RESTAURANT_ID } from "../fixtures/menu";

const ORG_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_ORG_ID = "22222222-2222-4222-8222-222222222222";

vi.mock("@/lib/auth/context-server", () => ({
  requireAuthContext: vi.fn(),
  resolveOrganizationId: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabase: vi.fn(),
}));

vi.mock("@/lib/notifications/dispatch", () => ({
  dispatchNotification: vi.fn(),
}));

vi.mock("@/lib/notifications/stuck-orders", () => ({
  notifyStuckOrdersForOrganization: vi.fn(),
}));

import { requireAuthContext, resolveOrganizationId } from "@/lib/auth/context-server";
import { dispatchNotification } from "@/lib/notifications/dispatch";
import { notifyStuckOrdersForOrganization } from "@/lib/notifications/stuck-orders";
import { createServerSupabase } from "@/lib/supabase/server";

function mockRestaurantLookup(organizationId: string | null) {
  const supabase = {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: organizationId ? { organization_id: organizationId } : null,
            error: null,
          }),
        }),
      }),
    }),
  };
  vi.mocked(createServerSupabase).mockResolvedValue(supabase as never);
  return supabase;
}

function mockCheckStuckRestaurants(
  rows: { id: string; name: string }[]
) {
  const supabase = {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: rows, error: null }),
      }),
    }),
  };
  vi.mocked(createServerSupabase).mockResolvedValue(supabase as never);
  return supabase;
}

describe("POST /api/notifications/events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(resolveOrganizationId).mockReturnValue({
      organizationId: ORG_ID,
    });
    vi.mocked(requireAuthContext).mockResolvedValue({
      context: {
        memberships: [{ organization_id: ORG_ID }],
      } as never,
      errorResponse: null,
    });
    vi.mocked(createServerSupabase).mockResolvedValue({} as never);
    vi.mocked(dispatchNotification).mockResolvedValue(undefined);
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(requireAuthContext).mockResolvedValue({
      context: null,
      errorResponse: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const req = new Request("http://localhost/api/notifications/events", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await postEvent(req);
    expect(res.status).toBe(401);
  });

  it("returns 403 when organization_id is not a membership", async () => {
    vi.mocked(resolveOrganizationId).mockReturnValue({
      error: "You are not a member of that organization",
    });

    const req = new Request(
      "http://localhost/api/notifications/events?organization_id=99999999-9999-4999-8999-999999999999",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_type: "sync_failure",
          title: "Sync failed",
          body: "Details",
        }),
      }
    );
    const res = await postEvent(req);
    expect(res.status).toBe(403);
    expect(dispatchNotification).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid event_type", async () => {
    const req = new Request("http://localhost/api/notifications/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_type: "not_real",
        title: "Test",
        body: "Test body",
      }),
    });
    const res = await postEvent(req);
    expect(res.status).toBe(400);
    expect(dispatchNotification).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid JSON", async () => {
    const req = new Request("http://localhost/api/notifications/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{",
    });
    const res = await postEvent(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid JSON");
  });

  it("returns 403 when restaurant_id is unknown", async () => {
    mockRestaurantLookup(null);

    const req = new Request("http://localhost/api/notifications/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_type: "order_completed",
        restaurant_id: RESTAURANT_ID,
        title: "Done",
        body: "Order complete",
      }),
    });
    const res = await postEvent(req);
    expect(res.status).toBe(403);
    expect(dispatchNotification).not.toHaveBeenCalled();
  });

  it("returns 403 when restaurant belongs to another org", async () => {
    mockRestaurantLookup(OTHER_ORG_ID);

    const req = new Request("http://localhost/api/notifications/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_type: "order_completed",
        restaurant_id: RESTAURANT_ID,
        title: "Done",
        body: "Order complete",
      }),
    });
    const res = await postEvent(req);
    expect(res.status).toBe(403);
    expect(dispatchNotification).not.toHaveBeenCalled();
  });

  it("dispatches org-scoped events without restaurant_id", async () => {
    const req = new Request("http://localhost/api/notifications/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_type: "sync_failure",
        title: "Sync failed",
        body: "Agent tools out of date",
      }),
    });
    const res = await postEvent(req);
    expect(res.status).toBe(200);
    expect(dispatchNotification).toHaveBeenCalledWith(expect.anything(), {
      organizationId: ORG_ID,
      restaurantId: null,
      restaurantName: null,
      eventType: "sync_failure",
      title: "Sync failed",
      body: "Agent tools out of date",
      payload: undefined,
      idempotencyKey: undefined,
    });
  });

  it("accepts realtime_degraded payload", async () => {
    mockRestaurantLookup(ORG_ID);

    const req = new Request("http://localhost/api/notifications/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_type: "realtime_degraded",
        restaurant_id: RESTAURANT_ID,
        restaurant_name: "Test",
        title: "Realtime degraded",
        body: "Polling fallback active",
        idempotency_key: "realtime_degraded:test:hour",
      }),
    });
    const res = await postEvent(req);
    expect(res.status).toBe(200);
    expect(dispatchNotification).toHaveBeenCalledOnce();
  });
});

describe("POST /api/notifications/check-stuck", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(resolveOrganizationId).mockReturnValue({
      organizationId: ORG_ID,
    });
    vi.mocked(requireAuthContext).mockResolvedValue({
      context: {
        memberships: [{ organization_id: ORG_ID }],
      } as never,
      errorResponse: null,
    });
    vi.mocked(notifyStuckOrdersForOrganization).mockResolvedValue(2);
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(requireAuthContext).mockResolvedValue({
      context: null,
      errorResponse: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const res = await postCheckStuck(
      new Request("http://localhost/api/notifications/check-stuck", {
        method: "POST",
      })
    );
    expect(res.status).toBe(401);
    expect(notifyStuckOrdersForOrganization).not.toHaveBeenCalled();
  });

  it("returns 403 when organization_id is not a membership", async () => {
    vi.mocked(resolveOrganizationId).mockReturnValue({
      error: "You are not a member of that organization",
    });

    const res = await postCheckStuck(
      new Request(
        "http://localhost/api/notifications/check-stuck?organization_id=99999999-9999-4999-8999-999999999999",
        { method: "POST" }
      )
    );
    expect(res.status).toBe(403);
    expect(notifyStuckOrdersForOrganization).not.toHaveBeenCalled();
  });

  it("returns notified count for the resolved org", async () => {
    mockCheckStuckRestaurants([
      { id: RESTAURANT_ID, name: "Test" },
    ]);

    const res = await postCheckStuck(
      new Request("http://localhost/api/notifications/check-stuck", { method: "POST" })
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true, notified: 2 });
    expect(notifyStuckOrdersForOrganization).toHaveBeenCalledWith(expect.anything(), {
      organizationId: ORG_ID,
      restaurantNames: new Map([[RESTAURANT_ID, "Test"]]),
    });
  });
});
