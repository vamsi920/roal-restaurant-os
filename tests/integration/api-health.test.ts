import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/health/route";

vi.mock("@/lib/observability/health", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/observability/health")>();
  return { ...actual, runHealthChecks: vi.fn() };
});

import { runHealthChecks } from "@/lib/observability/health";

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns request id header and no raw supabase URL in body", async () => {
    vi.mocked(runHealthChecks).mockResolvedValue({
      status: "healthy",
      timestamp: "2026-05-19T00:00:00.000Z",
      checks: {
        env_public: {
          ok: true,
          status: "pass",
          details: {
            supabase_url: "https://abc.supabase.co",
            anon_key_configured: true,
          },
        },
        env_server: {
          ok: true,
          status: "pass",
          details: {
            supabase: true,
            serviceRole: true,
            gemini: true,
            elevenlabs: true,
            agentTools: true,
            stripe: false,
          },
        },
        supabase_db: { ok: true, status: "pass" },
        gemini: { ok: true, status: "pass" },
        elevenlabs: { ok: true, status: "pass" },
        edge_get_menu: { ok: true, status: "pass" },
        edge_sync_draft_order: { ok: true, status: "pass" },
        edge_finalize_order: { ok: true, status: "pass" },
      },
    });

    const req = new Request("http://localhost/api/health", {
      headers: { "x-request-id": "health-req-1" },
    });
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(res.headers.get("x-request-id")).toBe("health-req-1");
    expect(body.request_id).toBe("health-req-1");
    expect(JSON.stringify(body)).not.toMatch(/eyJ[a-zA-Z0-9_-]+\./);
    expect(body.checks.env_public.details).not.toHaveProperty("supabase_url");
  });

  it("returns generic error body when checks throw", async () => {
    vi.mocked(runHealthChecks).mockRejectedValue(
      new Error("SUPABASE_SERVICE_ROLE_KEY=secret-value-leak")
    );

    const res = await GET(new Request("http://localhost/api/health"));
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.error).toBe("Health check failed");
    expect(JSON.stringify(body)).not.toContain("secret-value-leak");
  });
});
