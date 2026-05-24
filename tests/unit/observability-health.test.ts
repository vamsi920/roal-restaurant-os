import { describe, expect, it } from "vitest";
import {
  sanitizeHealthReportForPublic,
  type HealthReport,
} from "@/lib/observability/health";
import {
  generateRequestId,
  getOrCreateRequestId,
  REQUEST_ID_HEADER,
} from "@/lib/observability/request-id";
import { sanitizeLogFields } from "@/lib/observability/logger";

describe("sanitizeHealthReportForPublic", () => {
  it("removes supabase URLs and sensitive detail keys", () => {
    const report: HealthReport = {
      status: "degraded",
      timestamp: new Date().toISOString(),
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
            service_role: true,
            api_key: "should-not-appear",
          },
        },
        supabase_db: {
          ok: false,
          status: "fail",
          message: "connect failed https://db.internal.example/x",
        },
        gemini: { ok: true, status: "pass" },
        elevenlabs: { ok: true, status: "pass" },
        edge_get_menu: {
          ok: true,
          status: "pass",
          details: { reachable: true, http_status: 204 },
        },
        edge_sync_draft_order: { ok: true, status: "pass" },
        edge_finalize_order: { ok: true, status: "pass" },
      },
    };

    const safe = sanitizeHealthReportForPublic(report);
    expect(safe.checks.env_public.details).toEqual({
      anon_key_configured: true,
    });
    expect(safe.checks.env_server.details).toEqual({ supabase: true });
    expect(safe.checks.supabase_db.message).toBe(
      "connect failed [redacted-url]"
    );
    expect(safe.checks.edge_get_menu.details).toEqual({ reachable: true });
  });
});

describe("request id helpers", () => {
  it("reuses incoming header when present", () => {
    const headers = new Headers({ [REQUEST_ID_HEADER]: "req-existing" });
    expect(getOrCreateRequestId(headers)).toBe("req-existing");
  });

  it("generates id when header missing", () => {
    const id = getOrCreateRequestId(new Headers());
    expect(id.length).toBeGreaterThan(8);
    expect(generateRequestId()).toMatch(
      /^[0-9a-f-]{36}$|^req_\d+_[a-z0-9]+$/i
    );
  });
});

describe("sanitizeLogFields", () => {
  it("redacts sensitive field names", () => {
    expect(
      sanitizeLogFields({
        order_id: "o1",
        api_key: "sk-test",
        authorization: "Bearer x",
      })
    ).toEqual({
      order_id: "o1",
      api_key: "[redacted]",
      authorization: "[redacted]",
    });
  });
});
