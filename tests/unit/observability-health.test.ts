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
  it("removes URLs, non-boolean details and sensitive detail keys", () => {
    const report: HealthReport = {
      status: "degraded",
      timestamp: new Date().toISOString(),
      checks: {
        env_public: {
          ok: true,
          status: "pass",
          details: {
            app_url: "https://getroal.com",
            firebase_configured: true,
          },
        },
        env_server: {
          ok: true,
          status: "pass",
          details: {
            firebase: true,
            service_account: true,
            api_key: "should-not-appear",
          },
        },
        database: {
          ok: false,
          status: "fail",
          message: "connect failed https://firestore.googleapis.com/x",
        },
        gemini: { ok: true, status: "pass" },
        elevenlabs: { ok: true, status: "pass" },
        agent_tools: {
          ok: true,
          status: "pass",
          details: { public_https_origin: true, origin: "https://tunnel.example" },
        },
      },
    };

    const safe = sanitizeHealthReportForPublic(report);
    expect(safe.checks.env_public.details).toEqual({ firebase_configured: true });
    expect(safe.checks.env_server.details).toEqual({ firebase: true });
    expect(safe.checks.database.message).toBe("connect failed [redacted-url]");
    expect(safe.checks.agent_tools.details).toEqual({ public_https_origin: true });
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
