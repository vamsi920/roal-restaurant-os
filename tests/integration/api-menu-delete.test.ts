import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE } from "@/app/api/restaurants/[id]/menu/route";
import { RESTAURANT_ID } from "../fixtures/menu";

vi.mock("@/lib/auth/context-server", () => ({
  requireRestaurantAccess: vi.fn(),
}));

vi.mock("@/lib/voice-agent/after-menu-content-mutation", () => ({
  afterMenuContentMutation: vi.fn(),
}));

import { requireRestaurantAccess } from "@/lib/auth/context-server";
import { createMemoryDb, getDb } from "@/lib/db";
import { resetMemoryStore } from "@/lib/db/store";
import { afterMenuContentMutation } from "@/lib/voice-agent/after-menu-content-mutation";

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
    context: { user: { id: "user-1", email: "owner@example.com" } },
    errorResponse: null,
  };
}

describe("DELETE /api/restaurants/[id]/menu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMemoryStore();
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
    expect(afterMenuContentMutation).not.toHaveBeenCalled();
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

  it("deletes only this restaurant's categories and schedules voice sync", async () => {
    vi.mocked(requireRestaurantAccess).mockResolvedValue(accessOk());
    const db = createMemoryDb();
    await db.from("categories").insert([
      { id: "c1", restaurant_id: RESTAURANT_ID, name: "Starters" },
      { id: "c2", restaurant_id: RESTAURANT_ID, name: "Mains" },
      { id: "c3", restaurant_id: "other-restaurant", name: "Starters" },
    ]);

    const res = await DELETE(new Request("http://localhost/api"), {
      params: { id: RESTAURANT_ID },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.deleted_categories).toBe(2);

    const { data: left } = await getDb().from("categories").select("id");
    expect((left ?? []).map((r: { id: string }) => r.id)).toEqual(["c3"]);
    expect(afterMenuContentMutation).toHaveBeenCalledWith(RESTAURANT_ID, {
      userId: "user-1",
      restaurantName: "Test",
    });
  });

  it("returns 200 with zero deleted when the menu is already empty", async () => {
    vi.mocked(requireRestaurantAccess).mockResolvedValue(accessOk());

    const res = await DELETE(new Request("http://localhost/api"), {
      params: { id: RESTAURANT_ID },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.deleted_categories).toBe(0);
  });
});
