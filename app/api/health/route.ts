import {
  runHealthChecks,
  sanitizeHealthReportForPublic,
} from "@/lib/observability/health";
import {
  getRouteObservability,
  jsonResponse,
} from "@/lib/observability/route-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { requestId, log } = getRouteObservability(req, "api.health");

  try {
    const report = sanitizeHealthReportForPublic(await runHealthChecks());
    log.info("health_check_completed", {
      status: report.status,
      checks: Object.fromEntries(
        Object.entries(report.checks).map(([key, check]) => [
          key,
          { ok: check.ok, status: check.status },
        ])
      ),
    });

    const httpStatus = report.status === "unhealthy" ? 503 : 200;

    return jsonResponse(
      {
        ok: report.status !== "unhealthy",
        ...report,
        request_id: requestId,
      },
      { status: httpStatus },
      requestId
    );
  } catch (e) {
    log.error("health_check_failed", {
      error_type: e instanceof Error ? e.name : "unknown",
    });
    return jsonResponse(
      {
        ok: false,
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        request_id: requestId,
        error: "Health check failed",
      },
      { status: 503 },
      requestId
    );
  }
}
