import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as processPost } from "@/app/api/scanner/process/route";
import { POST as commitPost } from "@/app/api/scanner/commit/route";
import { POST as discardPost } from "@/app/api/scanner/discard/route";
import { POST as computeTotalsPost } from "@/app/api/restaurants/[id]/orders/compute-totals/route";
import { PATCH as orderPatch } from "@/app/api/restaurants/[id]/orders/[orderId]/route";
import { DELETE as menuDelete } from "@/app/api/restaurants/[id]/menu/route";
import { GET as menuImportsGet } from "@/app/api/restaurants/[id]/menu-imports/route";
import { RESTAURANT_ID } from "../fixtures/menu";

const ORDER_ID = "66666666-6666-4666-8666-666666666666";
const USER_ID = "77777777-7777-4777-8777-777777777777";
const UNKNOWN_RESTAURANT_ID = "00000000-0000-4000-8000-000000009999";

function unauthorizedRestaurantAccess() {
  return {
    access: null,
    context: null,
    errorResponse: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
  };
}

function forbiddenRestaurantAccess() {
  return {
    access: null,
    context: { user: { id: USER_ID } } as never,
    errorResponse: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
  };
}

function notFoundRestaurantAccess() {
  return {
    access: null,
    context: { user: { id: USER_ID } } as never,
    errorResponse: NextResponse.json(
      { error: "Restaurant not found" },
      { status: 404 }
    ),
  };
}

vi.mock("@/lib/auth/context-server", () => ({
  requireRestaurantAccess: vi.fn(),
}));

vi.mock("@/lib/scanner/extract-menu", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/scanner/extract-menu")>();
  return {
    ...actual,
    extractMenuFromImage: vi.fn(),
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabase: vi.fn(),
}));

import { requireRestaurantAccess } from "@/lib/auth/context-server";
import { createServerSupabase } from "@/lib/supabase/server";
import { extractMenuFromImage } from "@/lib/scanner/extract-menu";

describe("API auth negative gaps", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createServerSupabase).mockResolvedValue({} as never);
  });

  describe("POST /api/scanner/process (deprecated)", () => {
    it("returns 401 when unauthenticated", async () => {
      vi.mocked(requireRestaurantAccess).mockResolvedValue(
        unauthorizedRestaurantAccess()
      );

      const fd = new FormData();
      fd.append("restaurant_id", RESTAURANT_ID);
      fd.append("image", new File([new Uint8Array(8)], "menu.jpg"));

      const res = await processPost(
        new Request("http://localhost/api/scanner/process", {
          method: "POST",
          body: fd,
        })
      );
      expect(res.status).toBe(401);
    });

    it("returns 403 when restaurant access is forbidden", async () => {
      vi.mocked(requireRestaurantAccess).mockResolvedValue(
        forbiddenRestaurantAccess()
      );

      const fd = new FormData();
      fd.append("restaurant_id", RESTAURANT_ID);
      fd.append("image", new File([new Uint8Array(8)], "menu.jpg"));

      const res = await processPost(
        new Request("http://localhost/api/scanner/process", {
          method: "POST",
          body: fd,
        })
      );
      expect(res.status).toBe(403);
      expect(extractMenuFromImage).not.toHaveBeenCalled();
    });
  });

  describe("invalid JSON bodies", () => {
    it("POST /api/scanner/commit returns 400 for malformed JSON", async () => {
      const res = await commitPost(
        new Request("http://localhost/api/scanner/commit", {
          method: "POST",
          body: "{not-json",
        })
      );
      const body = await res.json();
      expect(res.status).toBe(400);
      expect(body.error).toBe("Invalid JSON");
      expect(requireRestaurantAccess).not.toHaveBeenCalled();
    });

    it("POST /api/scanner/discard returns 400 for malformed JSON", async () => {
      const res = await discardPost(
        new Request("http://localhost/api/scanner/discard", {
          method: "POST",
          body: "{bad",
        })
      );
      expect(res.status).toBe(400);
      expect(requireRestaurantAccess).not.toHaveBeenCalled();
    });

    it("PATCH …/orders/[orderId] returns 400 for malformed JSON", async () => {
      vi.mocked(requireRestaurantAccess).mockResolvedValue({
        access: {
          restaurant: {
            id: RESTAURANT_ID,
            organization_id: "11111111-1111-4111-8111-111111111111",
            name: "Test",
            created_at: "",
          },
          membership: {} as never,
          role: "owner" as const,
        },
        context: { user: { id: USER_ID } } as never,
        errorResponse: null,
      });

      const res = await orderPatch(
        new Request("http://localhost/api", {
          method: "PATCH",
          body: "{",
        }),
        { params: { id: RESTAURANT_ID, orderId: ORDER_ID } }
      );
      const body = await res.json();
      expect(res.status).toBe(400);
      expect(body.error).toBe("Invalid JSON");
      expect(createServerSupabase).not.toHaveBeenCalled();
    });

    it("POST …/compute-totals returns 400 for malformed JSON", async () => {
      vi.mocked(requireRestaurantAccess).mockResolvedValue({
        access: {
          restaurant: {
            id: RESTAURANT_ID,
            organization_id: "11111111-1111-4111-8111-111111111111",
            name: "Test",
            created_at: "",
          },
          membership: {} as never,
          role: "owner" as const,
        },
        context: { user: { id: USER_ID } } as never,
        errorResponse: null,
      });

      const res = await computeTotalsPost(
        new Request("http://localhost/api", {
          method: "POST",
          body: "not-json",
        }),
        { params: { id: RESTAURANT_ID } }
      );
      expect(res.status).toBe(400);
      expect(createServerSupabase).not.toHaveBeenCalled();
    });
  });

  describe("restaurant scope errors", () => {
    it("DELETE /api/restaurants/[id]/menu returns 403 when forbidden", async () => {
      vi.mocked(requireRestaurantAccess).mockResolvedValue(
        forbiddenRestaurantAccess()
      );

      const res = await menuDelete(new Request("http://localhost/api"), {
        params: { id: RESTAURANT_ID },
      });
      expect(res.status).toBe(403);
      expect(createServerSupabase).not.toHaveBeenCalled();
    });

    it("GET /api/restaurants/[id]/menu-imports returns 401 when unauthenticated", async () => {
      vi.mocked(requireRestaurantAccess).mockResolvedValue(
        unauthorizedRestaurantAccess()
      );

      const res = await menuImportsGet(new Request("http://localhost/api"), {
        params: { id: RESTAURANT_ID },
      });
      expect(res.status).toBe(401);
    });

    it("GET /api/restaurants/[id]/menu-imports returns 404 when restaurant missing", async () => {
      vi.mocked(requireRestaurantAccess).mockResolvedValue(
        notFoundRestaurantAccess()
      );

      const res = await menuImportsGet(new Request("http://localhost/api"), {
        params: { id: UNKNOWN_RESTAURANT_ID },
      });
      expect(res.status).toBe(404);
    });

    it("POST …/compute-totals returns 403 when forbidden", async () => {
      vi.mocked(requireRestaurantAccess).mockResolvedValue(
        forbiddenRestaurantAccess()
      );

      const res = await computeTotalsPost(
        new Request("http://localhost/api", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: [] }),
        }),
        { params: { id: RESTAURANT_ID } }
      );
      expect(res.status).toBe(403);
      expect(createServerSupabase).not.toHaveBeenCalled();
    });

    it("POST …/compute-totals returns 404 when restaurant missing", async () => {
      vi.mocked(requireRestaurantAccess).mockResolvedValue(
        notFoundRestaurantAccess()
      );

      const res = await computeTotalsPost(
        new Request("http://localhost/api", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: [] }),
        }),
        { params: { id: UNKNOWN_RESTAURANT_ID } }
      );
      expect(res.status).toBe(404);
    });
  });
});
