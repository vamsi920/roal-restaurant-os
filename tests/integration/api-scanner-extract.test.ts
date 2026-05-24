import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/scanner/extract/route";
import { RESTAURANT_ID } from "../fixtures/menu";

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

function imageFile(
  parts: Partial<{ name: string; type: string; size: number }> = {}
): File {
  const size = parts.size ?? 256;
  return new File([new Uint8Array(size)], parts.name ?? "menu.jpg", {
    type: parts.type ?? "image/jpeg",
  });
}

vi.mock("@/lib/auth/context-server", () => ({
  requireRestaurantAccess: vi.fn(),
}));

vi.mock("@/lib/billing/assert-gate", () => ({
  assertOrganizationBillingGate: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabase: vi.fn(),
}));

vi.mock("@/lib/scanner/menu-import-audit", () => ({
  createMenuImportRecord: vi.fn(),
  uploadMenuImportFile: vi.fn(),
  patchMenuImportStatus: vi.fn(),
  recordMenuImportExtracted: vi.fn(),
  recordMenuImportExtractionFailed: vi.fn(),
}));

vi.mock("@/lib/scanner/extract-menu", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/scanner/extract-menu")>();
  return {
    ...actual,
    extractMenuFromImage: vi.fn(),
  };
});

vi.mock("@/lib/usage/record", () => ({
  recordRestaurantUsage: vi.fn(),
}));

vi.mock("@/lib/observability/audit", () => ({
  writeAuditLog: vi.fn(),
}));

vi.mock("@/lib/notifications/helpers", () => ({
  notifyScanFailure: vi.fn(),
}));

import { requireRestaurantAccess } from "@/lib/auth/context-server";
import { assertOrganizationBillingGate } from "@/lib/billing/assert-gate";
import { createServerSupabase } from "@/lib/supabase/server";
import { extractMenuFromImage } from "@/lib/scanner/extract-menu";

function postExtract(form: FormData) {
  return POST(
    new Request("http://localhost/api/scanner/extract", {
      method: "POST",
      body: form,
    })
  );
}

describe("POST /api/scanner/extract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(requireRestaurantAccess).mockResolvedValue({
      access: null,
      context: null,
      errorResponse: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const fd = new FormData();
    fd.append("restaurant_id", RESTAURANT_ID);
    fd.append("image", imageFile());

    const res = await postExtract(fd);
    expect(res.status).toBe(401);
  });

  it("returns 400 when restaurant_id missing (before auth)", async () => {
    const fd = new FormData();
    fd.append("image", imageFile());

    const res = await postExtract(fd);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("restaurant_id is required");
    expect(requireRestaurantAccess).not.toHaveBeenCalled();
  });

  it("returns 400 when image missing", async () => {
    vi.mocked(requireRestaurantAccess).mockResolvedValue(accessOk());

    const fd = new FormData();
    fd.append("restaurant_id", RESTAURANT_ID);

    const res = await postExtract(fd);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("image file is required");
    expect(createServerSupabase).not.toHaveBeenCalled();
  });

  it("returns 400 for non-image upload", async () => {
    vi.mocked(requireRestaurantAccess).mockResolvedValue(accessOk());

    const fd = new FormData();
    fd.append("restaurant_id", RESTAURANT_ID);
    fd.append(
      "image",
      new File([new Uint8Array(100)], "doc.pdf", {
        type: "application/pdf",
      })
    );

    const res = await postExtract(fd);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/not an image/i);
    expect(createServerSupabase).not.toHaveBeenCalled();
  });

  it("returns 200 with menu shape when extraction succeeds", async () => {
    vi.mocked(requireRestaurantAccess).mockResolvedValue(accessOk());
    vi.mocked(assertOrganizationBillingGate).mockResolvedValue({ ok: true });
    vi.mocked(createServerSupabase).mockResolvedValue({} as never);
    vi.mocked(extractMenuFromImage).mockResolvedValue({
      menu: {
        categories: [
          {
            name: "Mains",
            sort_order: 1,
            items: [
              {
                name: "Burger",
                price: 12,
                base_availability: true,
                modifiers: [],
              },
            ],
          },
        ],
      },
      hints: [],
      modelUsed: "gemini-2.5-flash",
    });

    const { createMenuImportRecord, recordMenuImportExtracted } =
      await import("@/lib/scanner/menu-import-audit");
    vi.mocked(createMenuImportRecord).mockResolvedValue({
      id: "import-1",
      storage_path: "path/menu.jpg",
    } as never);

    const fd = new FormData();
    fd.append("restaurant_id", RESTAURANT_ID);
    fd.append("image", imageFile());

    const res = await postExtract(fd);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.import_id).toBe("import-1");
    expect(body.menu.categories).toHaveLength(1);
    expect(body.summary).toMatchObject({
      categories: 1,
      items: 1,
    });
    expect(recordMenuImportExtracted).toHaveBeenCalled();
  });
});
