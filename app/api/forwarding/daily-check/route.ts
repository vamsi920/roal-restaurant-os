import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getServerEnv } from "@/lib/env.server";
import { isValidCronRequest } from "@/lib/cron/cron-token";
import { runForwardingDailyCheck } from "@/lib/forwarding/daily-check";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Daily: flag locations whose call forwarding looks switched off. */
export async function POST(req: Request) {
  if (!isValidCronRequest(req, getServerEnv().AGENT_TOOL_SIGNING_SECRET)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    const result = await runForwardingDailyCheck(getDb());
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("[forwarding] daily check", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Check failed." }, { status: 500 });
  }
}
