import { createHmac } from "node:crypto";

/** Hourly: ask the app to bill any completed orders whose usage report failed. */
export default async () => {
  const secret = process.env.AGENT_TOOL_SIGNING_SECRET?.trim();
  const base = (process.env.URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  if (!secret || !base) {
    console.error("[usage-sweep] missing AGENT_TOOL_SIGNING_SECRET or site URL");
    return;
  }
  // Same derivation as lib/cron/cron-token.ts.
  const token = createHmac("sha256", secret).update("roal-cron-v1").digest("hex");
  const res = await fetch(`${base}/api/billing/usage-sweep`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log("[usage-sweep]", res.status, await res.text());
};

export const config = { schedule: "@hourly" };
