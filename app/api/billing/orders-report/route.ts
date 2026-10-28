import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/context-server";
import { getDb } from "@/lib/db";
import { loadOrderReport, orderReportCsv } from "@/lib/billing/orders-report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_RANGE_MS = 400 * 24 * 60 * 60 * 1000;

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d : null;
}

/** CSV of completed phone orders (and their per-order fee) for one billing period. */
export async function GET(req: Request) {
  const context = await getAuthContext();
  const membership = context?.primaryMembership;
  if (!membership) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const now = new Date();
  const from = parseDate(url.searchParams.get("from")) ?? new Date(now.getFullYear(), now.getMonth(), 1);
  const to = parseDate(url.searchParams.get("to")) ?? now;
  if (to < from || to.getTime() - from.getTime() > MAX_RANGE_MS) {
    return NextResponse.json({ error: "Pick a shorter date range." }, { status: 400 });
  }

  const db = getDb();
  const { data: restaurants } = await db
    .from("restaurants")
    .select("id")
    .eq("organization_id", membership.organization_id);
  const restaurantIds = ((restaurants ?? []) as Array<{ id: string }>).map((r) => r.id);

  const { data: profile } = restaurantIds.length
    ? await db.from("restaurant_profiles").select("timezone").eq("restaurant_id", restaurantIds[0]).maybeSingle<{ timezone: string | null }>()
    : { data: null };
  let timeZone = profile?.timezone?.trim() || "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
  } catch {
    timeZone = "UTC";
  }

  const rows = await loadOrderReport(db, { restaurantIds, from, to });
  const day = (d: Date) => d.toISOString().slice(0, 10);
  return new NextResponse(orderReportCsv(rows, timeZone), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="roal-orders-${day(from)}-to-${day(to)}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
