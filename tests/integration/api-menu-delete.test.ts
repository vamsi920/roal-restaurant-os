import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE } from "@/app/api/restaurants/[id]/menu/route";
import { RESTAURANT_ID } from "../fixtures/menu";

vi.mock("@/lib/auth/context-server", () => ({
  requireRestaurantAccess: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabase: vi.fn(),
  getServiceRoleSupabase: vi.fn(),
}));

import { requireRestaurantAccess } from "@/lib/auth/context-server";
import {
  createServerSupabase,
  getServiceRoleSupabase,
} from "@/lib/supabase/server";

function accessOk() {
  return {
    access: {
      restaurant: {
        id: RESTAURANT_ID,
        organization_id: "11111111-1111-4111-8111-111111111111",
        name: "Test",
        slug: "test",
        created_at: "",
        updated_at: "",
      },
      role: "owner" as const,
    },
    context: null,
    errorResponse: null,
  };
}

describe("DELETE /api/restaurants/[id]/menu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServiceRoleSupabase).mockReturnValue(null);
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(requireRestaurantAccess).mockResolvedValue({
      access: null,
      context: null,
      errorResponse: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const res = await DELETE(new Request("http://localhost/api"), {
      params: { id: RESTAURANT_ID },
    });
    expect(res.status).toBe(401);
    expect(createServerSupabase).not.toHaveBeenCalled();
  });

  it("returns 400 when restaurant id missing", async () => {
    vi.mocked(requireRestaurantAccess).mockResolvedValue(accessOk());

    const res = await DELETE(new Request("http://localhost/api"), {
      params: { id: "" },
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/missing restaurant id/i);
  });

  it("clears menu via clear_restaurant_menu RPC", async () => {
    vi.mocked(requireRestaurantAccess).mockResolvedValue(accessOk());
    const rpc = vi.fn().mockResolvedValue({ data: 3, error: null });
    vi.mocked(createServerSupabase).mockResolvedValue({ rpc } as never);

    const res = await DELETE(new Request("http://localhost/api"), {
      params: { id: RESTAURANT_ID },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      ok: true,
      deleted_categories: 3,
      via: "rpc",
    });
    expect(rpc).toHaveBeenCalledWith("clear_restaurant_menu", {
      p_restaurant_id: RESTAURANT_ID,
    });
  });

  it("clears menu via service role when configured", async () => {
    vi.mocked(requireRestaurantAccess).mockResolvedValue(accessOk());
    const select = vi.fn().mockResolvedValue({
      data: [{ id: "c1" }, { id: "c2" }],
      error: null,
    });
    const eq = vi.fn().mockReturnValue({ select });
    const deleteFn = vi.fn().mockReturnValue({ eq });
    vi.mocked(getServiceRoleSupabase).mockReturnValue({
      from: vi.fn().mockReturnValue({ delete: deleteFn }),
    } as never);

    const res = await DELETE(new Request("http://localhost/api"), {
      params: { id: RESTAURANT_ID },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      ok: true,
      deleted_categories: 2,
      via: "service_role",
    });
    expect(createServerSupabase).not.toHaveBeenCalled();
  });

  it("returns 500 when RPC fails", async () => {
    vi.mocked(requireRestaurantAccess).mockResolvedValue(accessOk());
    vi.mocked(createServerSupabase).mockResolvedValue({
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "permission denied" },
      }),
    } as never);

    const res = await DELETE(new Request("http://localhost/api"), {
      params: { id: RESTAURANT_ID },
    });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("permission denied");
  });
});
