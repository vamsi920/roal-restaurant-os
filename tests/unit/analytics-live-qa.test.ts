import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { formatUsdFromCents } from "@/components/analytics/format";

const REPO = join(import.meta.dirname, "../..");

describe("analytics live posture (launch 23)", () => {
  it("revenue estimate shows + when incomplete", () => {
    expect(formatUsdFromCents(1299, false)).toMatch(/\+$/);
    expect(formatUsdFromCents(1299, true)).not.toMatch(/\+$/);
  });

  it("dashboard only shows supported metrics", () => {
    const dash = readFileSync(
      join(REPO, "components/analytics/AnalyticsDashboard.tsx"),
      "utf8"
    );
    expect(dash).toContain("Calls answered");
    expect(dash).toContain("Orders taken");
    expect(dash).toContain("Sales from phone orders");
    expect(dash).toContain("Average order");
    expect(dash).toContain("Busiest time");
    expect(dash).toContain("Orders waiting too long");
    expect(dash).toContain("summary.stuckOrderCount > 0");
    expect(dash).toContain("Busiest call times");
    expect(dash).toContain("Questions only");
    expect(dash).toContain("Reservations");
    expect(dash).toContain("Add-on offers");
    expect(dash).toContain("/settings");
    expect(dash).not.toMatch(/page views|bounce rate|NPS|retention/i);
  });

  it("uses owner words only (no internal jargon on screen)", () => {
    const dash = readFileSync(
      join(REPO, "components/analytics/AnalyticsDashboard.tsx"),
      "utf8"
    );
    const chart = readFileSync(
      join(REPO, "components/analytics/OrdersTrendChart.tsx"),
      "utf8"
    );
    // Strip identifiers like summary.orderSessions; check only quoted / JSX copy.
    const copy = [dash, chart]
      .join("\n")
      .match(/"[^"\n]*"|`[^`\n]*`|>[^<>{}\n]+</g)!
      .join("\n");
    expect(copy).not.toMatch(
      /session|webhook|ElevenLabs|UTC|receipt|conversion trend|treatment|control split|deterministic|finalized|Menu scan/i
    );
  });

  it("empty state when no activity", () => {
    const dash = readFileSync(
      join(REPO, "components/analytics/AnalyticsDashboard.tsx"),
      "utf8"
    );
    expect(dash).toContain("No activity in this range");
    expect(dash).toContain("hasData");
  });

  it("range picker supports 7d/30d/90d only", () => {
    const picker = readFileSync(
      join(REPO, "components/analytics/AnalyticsRangePicker.tsx"),
      "utf8"
    );
    expect(picker).toContain('"7d"');
    expect(picker).toContain('"30d"');
    expect(picker).toContain('"90d"');
  });

  it("chart handles zero-length and daily buckets", () => {
    const chart = readFileSync(
      join(REPO, "components/analytics/OrdersTrendChart.tsx"),
      "utf8"
    );
    expect(chart).toContain("No daily data");
    expect(chart).toContain("Calls");
    expect(chart).toContain("Orders");
    expect(chart).toContain("Canceled");
  });

  it("load-analytics scopes queries to organization restaurants", () => {
    const load = readFileSync(
      join(REPO, "lib/analytics/load-analytics.ts"),
      "utf8"
    );
    expect(load).toContain("collectOrderSessions");
    expect(load).toContain("restaurant_upsell_rules");
    expect(load).toContain("aggregateUpsellAttachStats");
    expect(load).toContain('.eq("organization_id", input.organizationId)');
    expect(load).toContain(".in(\"restaurant_id\", restaurantIds)");
    expect(load).toContain("emptySnapshot");
    expect(load).toContain('? "restaurant"\n    : "organization"');
    expect(load).toContain("restaurantId: input.restaurantId");
  });
});
