import { createHmac } from "node:crypto";

/** Daily, late evening US time: flag locations whose call forwarding looks switched off. */
export default async () => {
  const secret = process.env.AGENT_TOOL_SIGNING_SECRET?.trim();
  const base = (process.env.URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  if (!secret || !base) {
    console.error("[forwarding-check] missing AGENT_TOOL_SIGNING_SECRET or site URL");
    return;
  }
  // Same derivation as lib/cron/cron-token.ts.
  const token = createHmac("sha256", secret).update("roal-cron-v1").digest("hex");
  const res = await fetch(`${base}/api/forwarding/daily-check`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log("[forwarding-check]", res.status, await res.text());
};

// 03:30 UTC is 11:30pm Eastern / 8:30pm Pacific, after most dinner service.
export const config = { schedule: "30 3 * * *" };
