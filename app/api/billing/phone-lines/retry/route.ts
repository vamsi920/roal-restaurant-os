import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getServerEnv } from "@/lib/env.server";
import { isValidCronRequest } from "@/lib/cron/cron-token";
import { retryMissingPhoneLines } from "@/lib/telephony/provision-phone-line";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Hourly: paid locations still missing a phone line get another attempt (netlify/functions/phone-line-retry.mts). */
export async function POST(req: Request) {
  if (!isValidCronRequest(req, getServerEnv().AGENT_TOOL_SIGNING_SECRET)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    const attempts = await retryMissingPhoneLines(getDb());
    const failed = attempts.filter((a) => !a.ok);
    if (failed.length) console.error("[phone-line-retry] still missing", JSON.stringify(failed));
    return NextResponse.json({ ok: true, attempted: attempts.length, failed: failed.length });
  } catch (e) {
    console.error("[phone-line-retry]", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Retry failed." }, { status: 500 });
  }
}
