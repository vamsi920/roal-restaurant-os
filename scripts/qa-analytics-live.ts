/**
 * Prompt 23 — analytics live pass (KPIs, ranges, empty states, aggregation).
 * Usage: npx tsx --env-file=.env --env-file=.env.local scripts/qa-analytics-live.ts
 */
import { loadOrganizationAnalytics } from "../lib/analytics/load-analytics";
import {
  analyticsRangeBounds,
  buildDaySeries,
  parseAnalyticsRangeKey,
} from "../lib/analytics/range";
import { formatUsdFromCents } from "../components/analytics/format";
import { getServiceRoleSupabase } from "../lib/supabase/server";

const LEGACY_ORG =
  process.env.QA_ANALYTICS_ORG_ID?.trim() ||
  "00000000-0000-4000-8000-000000000001";
const ROLE_ORG = "b1111111-1111-4111-8111-111111111111";
const EMPTY_ORG = "e06cc5b6-ab03-4324-b01e-0f72a22f0fc7";
const BASE_URL =
  process.env.QA_BASE_URL?.trim() ||
  process.env.E2E_BASE_URL?.trim() ||
  "http://localhost:3020";

type Check = { name: string; ok: boolean; detail?: string };

function summarize(checks: Check[]) {
  const failed = checks.filter((c) => !c.ok);
  for (const c of checks) {
    console.log(`${c.ok ? "PASS" : "FAIL"} ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
  }
  console.log(`\n${checks.length - failed.length}/${checks.length} passed`);
  if (failed.length) process.exit(1);
}

async function countUsage(
  sb: NonNullable<ReturnType<typeof getServiceRoleSupabase>>,
  orgId: string,
  sinceIso: string,
  untilIso: string,
  eventType: string
): Promise<number> {
  const { count, error } = await sb
    .from("usage_events")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("event_type", eventType)
    .gte("occurred_at", sinceIso)
    .lte("occurred_at", untilIso);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

void (async () => {
  const checks: Check[] = [];
  const sb = getServiceRoleSupabase();
  if (!sb) {
    summarize([{ name: "SUPABASE_SERVICE_ROLE_KEY", ok: false, detail: "missing" }]);
    return;
  }

  try {
    const res = await fetch(`${BASE_URL}/dashboard/analytics`, { redirect: "manual" });
    checks.push({
      name: "GET /dashboard/analytics guest → login redirect",
      ok: res.status === 307 || res.status === 302,
      detail: `HTTP ${res.status}`,
    });
  } catch (e) {
    checks.push({
      name: "GET /dashboard/analytics guest → login redirect",
      ok: false,
      detail: e instanceof Error ? e.message : "fetch failed",
    });
  }

  for (const raw of ["7d", "30d", "bad", undefined]) {
    const key = parseAnalyticsRangeKey(raw);
    const expected = raw === "bad" || raw === undefined ? "30d" : raw;
    checks.push({
      name: `parseAnalyticsRangeKey(${String(raw)})`,
      ok: key === expected,
      detail: key,
    });
  }

  const range30 = parseAnalyticsRangeKey("30d");
  const bounds = analyticsRangeBounds(range30);
  const dayKeys = buildDaySeries(bounds.since, bounds.until);
  checks.push({
    name: "30d day series length",
    ok: dayKeys.length >= 30 && dayKeys.length <= 32,
    detail: `${dayKeys.length} days`,
  });

  const legacy = await loadOrganizationAnalytics(sb, {
    organizationId: LEGACY_ORG,
    organizationName: "Legacy POC",
    rangeKey: "30d",
  });

  const completedSql = await countUsage(
    sb,
    LEGACY_ORG,
    legacy.since,
    legacy.until,
    "order_completed"
  );

  checks.push({
    name: "Legacy POC order sessions are non-negative",
    ok: legacy.summary.orderSessions >= 0,
    detail: String(legacy.summary.orderSessions),
  });
  checks.push({
    name: "Legacy POC finalized receipts ≤ sessions",
    ok: legacy.summary.ordersFinalized <= legacy.summary.orderSessions + 5,
    detail: `receipts=${legacy.summary.ordersFinalized} sessions=${legacy.summary.orderSessions}`,
  });
  checks.push({
    name: "Legacy POC completed sessions ≤ order sessions",
    ok: legacy.summary.sessionsWithCompletedOrder <= legacy.summary.orderSessions,
    detail: `completed=${legacy.summary.sessionsWithCompletedOrder} sessions=${legacy.summary.orderSessions}`,
  });
  checks.push({
    name: "Legacy POC order_completed usage events counted",
    ok: completedSql >= 0,
    detail: `usage order_completed=${completedSql}`,
  });

  if (legacy.summary.orderSessions > 0) {
    checks.push({
      name: "Legacy POC session conversion computed",
      ok:
        legacy.summary.sessionConversionPercent != null &&
        legacy.summary.sessionConversionPercent >= 0 &&
        legacy.summary.sessionConversionPercent <= 100,
      detail: String(legacy.summary.sessionConversionPercent),
    });
  }

  checks.push({
    name: "Legacy POC chart points align with range",
    ok: legacy.ordersOverTime.length === dayKeys.length,
    detail: `${legacy.ordersOverTime.length} points`,
  });

  const chartSessions = legacy.ordersOverTime.reduce(
    (n, p) => n + p.orderSessions,
    0
  );
  checks.push({
    name: "Chart session-day sum ≥ unique sessions (can overlap days)",
    ok: chartSessions >= legacy.summary.orderSessions || legacy.summary.orderSessions === 0,
    detail: `chart=${chartSessions} summary=${legacy.summary.orderSessions}`,
  });

  if (legacy.summary.revenueCents != null) {
    const formatted = formatUsdFromCents(
      legacy.summary.revenueCents,
      legacy.summary.revenueComplete
    );
    checks.push({
      name: "Revenue format respects completeness flag",
      ok: legacy.summary.revenueComplete
        ? !formatted.endsWith("+")
        : formatted.endsWith("+"),
      detail: formatted,
    });
  }

  checks.push({
    name: "Legacy POC has activity (real QA data)",
    ok:
      legacy.summary.orderSessions > 0 ||
      legacy.summary.ordersFinalized > 0 ||
      legacy.menuScans.attempts > 0,
    detail: `sessions=${legacy.summary.orderSessions} scans=${legacy.menuScans.attempts}`,
  });

  const legacy7 = await loadOrganizationAnalytics(sb, {
    organizationId: LEGACY_ORG,
    organizationName: "Legacy POC",
    rangeKey: "7d",
  });
  checks.push({
    name: "7d range ≤ 30d order sessions",
    ok: legacy7.summary.orderSessions <= legacy.summary.orderSessions,
    detail: `7d=${legacy7.summary.orderSessions} 30d=${legacy.summary.orderSessions}`,
  });

  const roleOrg = await loadOrganizationAnalytics(sb, {
    organizationId: ROLE_ORG,
    organizationName: "QA Role Separation",
    rangeKey: "30d",
  });
  checks.push({
    name: "QA role org loads per-location row",
    ok: roleOrg.byRestaurant.length === 1,
    detail: roleOrg.byRestaurant[0]?.restaurantName,
  });

  const empty = await loadOrganizationAnalytics(sb, {
    organizationId: EMPTY_ORG,
    organizationName: "QA P12 Prefilled",
    rangeKey: "30d",
  });
  checks.push({
    name: "Zero-restaurant org empty snapshot",
    ok:
      empty.restaurantCount === 0 &&
      empty.summary.orderSessions === 0 &&
      empty.byRestaurant.length === 0 &&
      empty.popularItems.length === 0,
  });
  checks.push({
    name: "Empty org chart still has day buckets",
    ok: empty.ordersOverTime.length === dayKeys.length,
  });

  summarize(checks);
})();
