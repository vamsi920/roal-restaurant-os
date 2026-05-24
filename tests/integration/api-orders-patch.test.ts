import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PATCH } from "@/app/api/restaurants/[id]/orders/[orderId]/route";
import { RESTAURANT_ID } from "../fixtures/menu";

const ORDER_ID = "66666666-6666-4666-8666-666666666666";
const USER_ID = "77777777-7777-4777-8777-777777777777";
const ORG_ID = "11111111-1111-4111-8111-111111111111";

function accessOk() {
  return {
    access: {
      restaurant: {
        id: RESTAURANT_ID,
        organization_id: ORG_ID,
        name: "Test",
        created_at: new Date().toISOString(),
      },
      membership: {} as never,
      role: "owner" as const,
    },
    context: { user: { id: USER_ID } } as never,
    errorResponse: null,
  };
}

function draftOrderRow(status: string) {
  return {
    id: ORDER_ID,
    restaurant_id: RESTAURANT_ID,
    session_id: "sess",
    status,
    items: [],
    customer_name: null,
    customer_phone: null,
    accepted_at: null,
    in_progress_at: null,
    ready_at: null,
    completed_at: null,
    canceled_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function mockSupabaseForOrder(
  load: ReturnType<typeof draftOrderRow> | null,
  updated?: ReturnType<typeof draftOrderRow>
) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: load, error: null });
  const single = vi.fn().mockResolvedValue({
    data: updated ?? load,
    error: null,
  });
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({ maybeSingle })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({ single })),
          })),
        })),
      })),
    })),
  };
}

vi.mock("@/lib/auth/context-server", () => ({
  requireRestaurantAccess: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabase: vi.fn(),
}));

vi.mock("@/lib/notifications/helpers", () => ({
  notifyOrderCompleted: vi.fn(),
}));

vi.mock("@/lib/usage/record", () => ({
  recordRestaurantUsage: vi.fn(),
}));

vi.mock("@/lib/observability/audit", () => ({
  writeAuditLog: vi.fn(),
}));

import { requireRestaurantAccess } from "@/lib/auth/context-server";
import { createServerSupabase } from "@/lib/supabase/server";
import { recordRestaurantUsage } from "@/lib/usage/record";

describe("PATCH /api/restaurants/[id]/orders/[orderId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(requireRestaurantAccess).mockResolvedValue({
      access: null,
      context: null,
      errorResponse: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const req = new Request("http://localhost/api", {
      method: "PATCH",
      body: JSON.stringify({ action: "accept" }),
    });
    const res = await PATCH(req, {
      params: { id: RESTAURANT_ID, orderId: ORDER_ID },
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 when restaurant access is forbidden", async () => {
    vi.mocked(requireRestaurantAccess).mockResolvedValue({
      access: null,
      context: { user: { id: USER_ID } } as never,
      errorResponse: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    });

    const req = new Request("http://localhost/api", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "accept" }),
    });
    const res = await PATCH(req, {
      params: { id: RESTAURANT_ID, orderId: ORDER_ID },
    });

    expect(res.status).toBe(403);
    expect(vi.mocked(createServerSupabase)).not.toHaveBeenCalled();
  });

  it("returns 404 when order is missing for restaurant", async () => {
    vi.mocked(requireRestaurantAccess).mockResolvedValue(accessOk());
    vi.mocked(createServerSupabase).mockResolvedValue(
      mockSupabaseForOrder(null) as never
    );

    const req = new Request("http://localhost/api", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "accept" }),
    });
    const res = await PATCH(req, {
      params: { id: RESTAURANT_ID, orderId: ORDER_ID },
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Order not found");
  });

  it("returns 400 for invalid action before database access", async () => {
    vi.mocked(requireRestaurantAccess).mockResolvedValue(accessOk());

    const createServerSupabaseMock = vi.mocked(createServerSupabase);
    createServerSupabaseMock.mockRejectedValue(
      new Error("should not reach database")
    );

    const req = new Request("http://localhost/api", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "invalid_action" }),
    });
    const res = await PATCH(req, {
      params: { id: RESTAURANT_ID, orderId: ORDER_ID },
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("action must be one of");
    expect(createServerSupabaseMock).not.toHaveBeenCalled();
  });

  it("accepts a new order and returns milestone timestamps", async () => {
    vi.mocked(requireRestaurantAccess).mockResolvedValue(accessOk());
    const loaded = draftOrderRow("new");
    const acceptedAt = "2026-05-23T18:00:00.000Z";
    const updated = {
      ...loaded,
      status: "accepted",
      accepted_at: acceptedAt,
      updated_at: acceptedAt,
    };
    vi.mocked(createServerSupabase).mockResolvedValue(
      mockSupabaseForOrder(loaded, updated) as never
    );

    const req = new Request("http://localhost/api", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "accept" }),
    });
    const res = await PATCH(req, {
      params: { id: RESTAURANT_ID, orderId: ORDER_ID },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.order.status).toBe("accepted");
    expect(body.order.accepted_at).toBe(acceptedAt);
    expect(body.status).toBe("accepted");
  });

  it("records order_completed with session idempotency on complete", async () => {
    vi.mocked(requireRestaurantAccess).mockResolvedValue(accessOk());
    const loaded = draftOrderRow("ready");
    const completedAt = "2026-05-23T19:00:00.000Z";
    const updated = {
      ...loaded,
      status: "completed",
      completed_at: completedAt,
      updated_at: completedAt,
    };
    vi.mocked(createServerSupabase).mockResolvedValue(
      mockSupabaseForOrder(loaded, updated) as never
    );

    const req = new Request("http://localhost/api", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "complete" }),
    });
    const res = await PATCH(req, {
      params: { id: RESTAURANT_ID, orderId: ORDER_ID },
    });

    expect(res.status).toBe(200);
    expect(recordRestaurantUsage).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventType: "order_completed",
        idempotencyKey: `order_completed:${RESTAURANT_ID}:sess`,
        metadata: expect.objectContaining({ order_status: "completed" }),
      })
    );
  });

  it("cancels an accepted order and sets canceled_at", async () => {
    vi.mocked(requireRestaurantAccess).mockResolvedValue(accessOk());
    const loaded = draftOrderRow("accepted");
    loaded.accepted_at = "2026-05-23T17:00:00.000Z";
    const canceledAt = "2026-05-23T17:30:00.000Z";
    const updated = {
      ...loaded,
      status: "canceled",
      canceled_at: canceledAt,
      updated_at: canceledAt,
    };
    vi.mocked(createServerSupabase).mockResolvedValue(
      mockSupabaseForOrder(loaded, updated) as never
    );

    const req = new Request("http://localhost/api", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel" }),
    });
    const res = await PATCH(req, {
      params: { id: RESTAURANT_ID, orderId: ORDER_ID },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.order.status).toBe("canceled");
    expect(body.order.canceled_at).toBe(canceledAt);
  });

  it("returns 409 when transition is invalid", async () => {
    vi.mocked(requireRestaurantAccess).mockResolvedValue(accessOk());
    vi.mocked(createServerSupabase).mockResolvedValue(
      mockSupabaseForOrder({
        ...draftOrderRow("completed"),
        completed_at: new Date().toISOString(),
      }) as never
    );

    const req = new Request("http://localhost/api", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "accept" }),
    });
    const res = await PATCH(req, {
      params: { id: RESTAURANT_ID, orderId: ORDER_ID },
    });

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toContain("Cannot accept");
  });
});
