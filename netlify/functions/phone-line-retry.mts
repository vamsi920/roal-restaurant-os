import { createHmac } from "node:crypto";

/** Hourly: give paid locations that still have no phone line another attempt. */
export default async () => {
  const secret = process.env.AGENT_TOOL_SIGNING_SECRET?.trim();
  const base = (process.env.URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  if (!secret || !base) {
    console.error("[phone-line-retry] missing AGENT_TOOL_SIGNING_SECRET or site URL");
    return;
  }
  // Same derivation as lib/cron/cron-token.ts.
  const token = createHmac("sha256", secret).update("roal-cron-v1").digest("hex");
  const res = await fetch(`${base}/api/billing/phone-lines/retry`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log("[phone-line-retry]", res.status, await res.text());
};

export const config = { schedule: "@hourly" };
