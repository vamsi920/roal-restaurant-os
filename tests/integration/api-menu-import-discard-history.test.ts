import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as discardPost } from "@/app/api/scanner/discard/route";
import { GET as menuImportsGet } from "@/app/api/restaurants/[id]/menu-imports/route";
import { RESTAURANT_ID } from "../fixtures/menu";

const OTHER_RESTAURANT_ID = "639b2da9-3409-4fc9-b899-d313b7d7583f";
const IMPORT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ORG_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "77777777-7777-4777-8777-777777777777";

function accessOk(restaurantId: string) {
  return {
    access: {
      restaurant: {
        id: restaurantId,
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

vi.mock("@/lib/auth/context-server", () => ({
  requireRestaurantAccess: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabase: vi.fn(),
}));

vi.mock("@/lib/scanner/menu-import-audit", () => ({
  getMenuImportForRestaurant: vi.fn(),
  recordMenuImportDiscarded: vi.fn(),
  listRecentMenuImports: vi.fn(),
}));

vi.mock("@/lib/usage/record", () => ({
  recordRestaurantUsage: vi.fn(),
}));

import { requireRestaurantAccess } from "@/lib/auth/context-server";
import { createServerSupabase } from "@/lib/supabase/server";
import {
  getMenuImportForRestaurant,
  listRecentMenuImports,
  recordMenuImportDiscarded,
} from "@/lib/scanner/menu-import-audit";
import { recordRestaurantUsage } from "@/lib/usage/record";

describe("POST /api/scanner/discard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createServerSupabase).mockResolvedValue({} as never);
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(requireRestaurantAccess).mockResolvedValue({
      access: null,
      context: null,
      errorResponse: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const res = await discardPost(
      new Request("http://localhost/api/scanner/discard", {
        method: "POST",
        body: JSON.stringify({
          restaurant_id: RESTAURANT_ID,
          import_id: IMPORT_ID,
        }),
      })
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when restaurant_id or import_id missing", async () => {
    vi.mocked(requireRestaurantAccess).mockResolvedValue(accessOk(RESTAURANT_ID));

    const res = await discardPost(
      new Request("http://localhost/api/scanner/discard", {
        method: "POST",
        body: JSON.stringify({ restaurant_id: RESTAURANT_ID }),
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 403 when user cannot access restaurant", async () => {
    vi.mocked(requireRestaurantAccess).mockResolvedValue({
      access: null,
      context: { user: { id: USER_ID } } as never,
      errorResponse: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    });

    const res = await discardPost(
      new Request("http://localhost/api/scanner/discard", {
        method: "POST",
        body: JSON.stringify({
          restaurant_id: OTHER_RESTAURANT_ID,
          import_id: IMPORT_ID,
        }),
      })
    );
    expect(res.status).toBe(403);
    expect(getMenuImportForRestaurant).not.toHaveBeenCalled();
  });

  it("returns 404 when import not found for restaurant", async () => {
    vi.mocked(requireRestaurantAccess).mockResolvedValue(accessOk(RESTAURANT_ID));
    vi.mocked(getMenuImportForRestaurant).mockResolvedValue(null);

    const res = await discardPost(
      new Request("http://localhost/api/scanner/discard", {
        method: "POST",
        body: JSON.stringify({
          restaurant_id: RESTAURANT_ID,
          import_id: IMPORT_ID,
        }),
      })
    );
    expect(res.status).toBe(404);
    expect(recordMenuImportDiscarded).not.toHaveBeenCalled();
  });

  it("marks extracted import discarded without commit", async () => {
    vi.mocked(requireRestaurantAccess).mockResolvedValue(accessOk(RESTAURANT_ID));
    vi.mocked(getMenuImportForRestaurant).mockResolvedValue({
      id: IMPORT_ID,
      restaurant_id: RESTAURANT_ID,
      extraction_status: "extracted",
    } as never);

    const res = await discardPost(
      new Request("http://localhost/api/scanner/discard", {
        method: "POST",
        body: JSON.stringify({
          restaurant_id: RESTAURANT_ID,
          import_id: IMPORT_ID,
        }),
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(recordMenuImportDiscarded).toHaveBeenCalledWith(
      expect.anything(),
      IMPORT_ID
    );
    expect(recordRestaurantUsage).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventType: "import_attempt",
        metadata: expect.objectContaining({ outcome: "discarded" }),
      })
    );
  });

  it("returns 409 for committed import", async () => {
    vi.mocked(requireRestaurantAccess).mockResolvedValue(accessOk(RESTAURANT_ID));
    vi.mocked(getMenuImportForRestaurant).mockResolvedValue({
      id: IMPORT_ID,
      extraction_status: "committed",
    } as never);

    const res = await discardPost(
      new Request("http://localhost/api/scanner/discard", {
        method: "POST",
        body: JSON.stringify({
          restaurant_id: RESTAURANT_ID,
          import_id: IMPORT_ID,
        }),
      })
    );
    expect(res.status).toBe(409);
    expect(recordMenuImportDiscarded).not.toHaveBeenCalled();
  });

  it("is idempotent when already discarded", async () => {
    vi.mocked(requireRestaurantAccess).mockResolvedValue(accessOk(RESTAURANT_ID));
    vi.mocked(getMenuImportForRestaurant).mockResolvedValue({
      id: IMPORT_ID,
      extraction_status: "discarded",
    } as never);

    const res = await discardPost(
      new Request("http://localhost/api/scanner/discard", {
        method: "POST",
        body: JSON.stringify({
          restaurant_id: RESTAURANT_ID,
          import_id: IMPORT_ID,
        }),
      })
    );
    expect(res.status).toBe(200);
    expect(recordMenuImportDiscarded).not.toHaveBeenCalled();
  });
});

describe("GET /api/restaurants/[id]/menu-imports", () => {
  const sampleImport = {
    id: IMPORT_ID,
    restaurant_id: RESTAURANT_ID,
    organization_id: ORG_ID,
    uploaded_by: USER_ID,
    storage_bucket: "menu-uploads",
    storage_path: `${RESTAURANT_ID}/${IMPORT_ID}/menu.jpg`,
    original_filename: "menu.jpg",
    file_size_bytes: 1024,
    mime_type: "image/jpeg",
    model_used: "gemini",
    extraction_status: "discarded" as const,
    extraction_error: null,
    extracted_menu: null,
    review_hints: null,
    extraction_summary: null,
    merge_result: null,
    committed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    uploader_name: "QA User",
    signed_image_url: "https://signed.example/menu.jpg",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createServerSupabase).mockResolvedValue({} as never);
  });

  it("returns 403 for forbidden restaurant", async () => {
    vi.mocked(requireRestaurantAccess).mockResolvedValue({
      access: null,
      context: { user: { id: USER_ID } } as never,
      errorResponse: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    });

    const res = await menuImportsGet(new Request("http://localhost/api"), {
      params: { id: OTHER_RESTAURANT_ID },
    });
    expect(res.status).toBe(403);
    expect(listRecentMenuImports).not.toHaveBeenCalled();
  });

  it("returns ok and enriched import list", async () => {
    vi.mocked(requireRestaurantAccess).mockResolvedValue(accessOk(RESTAURANT_ID));
    vi.mocked(listRecentMenuImports).mockResolvedValue([sampleImport]);

    const res = await menuImportsGet(new Request("http://localhost/api"), {
      params: { id: RESTAURANT_ID },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.imports).toHaveLength(1);
    expect(body.imports[0]).toMatchObject({
      id: IMPORT_ID,
      extraction_status: "discarded",
      uploader_name: "QA User",
      signed_image_url: expect.stringContaining("https://"),
    });
    expect(listRecentMenuImports).toHaveBeenCalledWith(
      expect.anything(),
      RESTAURANT_ID,
      25
    );
  });
});
