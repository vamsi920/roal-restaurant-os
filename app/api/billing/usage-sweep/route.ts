import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getServerEnv } from "@/lib/env.server";
import { isValidCronRequest } from "@/lib/cron/cron-token";
import { reportMissedOrderUsage } from "@/lib/billing/report-usage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Hourly catch-up: bill completed orders whose usage report failed when the call ended. */
export async function POST(req: Request) {
  if (!isValidCronRequest(req, getServerEnv().AGENT_TOOL_SIGNING_SECRET)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    const result = await reportMissedOrderUsage(getDb());
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("[billing] usage sweep", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Sweep failed." }, { status: 500 });
  }
}
