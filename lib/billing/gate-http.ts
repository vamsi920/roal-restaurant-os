import { NextResponse } from "next/server";
import type { GateVerdict } from "@/lib/billing/gates";

export function planLimitJsonResponse(verdict: GateVerdict, status = 402) {
  return NextResponse.json(
    {
      error: verdict.message,
      code: "plan_limit_reached",
      message: verdict.message,
      title: verdict.title,
      limit_key: verdict.limitKey,
      action: verdict.action,
      used: verdict.used,
      limit: verdict.limit,
      upgrade_url: verdict.upgradeHref,
    },
    { status }
  );
}
