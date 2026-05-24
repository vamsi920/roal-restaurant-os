/**
 * Prompt 20 — verify signing secret parity + signed roal1 token against Edge get-menu.
 * Usage: npx tsx --env-file=.env --env-file=.env.local scripts/qa-lb03-signing-parity.ts
 */
import { execSync } from "node:child_process";
import { mintAgentToolToken } from "../lib/agent-tools/token";
import { getPublicEnv } from "../lib/env.public";
import { ROAL_RESTAURANT_ID_HEADER } from "../lib/sync-elevenlabs-roal-tools";

const RESTAURANT_ID =
  process.env.QA_RESTAURANT_ID?.trim() || "9d3263d1-4d9d-4f89-bfc5-160e2cca1855";

function edgeHasSigningSecret(): boolean {
  try {
    const out = execSync("supabase secrets list", { encoding: "utf8" });
    return /\bAGENT_TOOL_SIGNING_SECRET\b/.test(out);
  } catch {
    return false;
  }
}

void (async () => {
  const checks: { name: string; ok: boolean; detail?: string }[] = [];

  const signingLocal = Boolean(process.env.AGENT_TOOL_SIGNING_SECRET?.trim());
  const legacyLocal = Boolean(process.env.AGENT_TOOL_SECRET?.trim());
  checks.push({
    name: "local AGENT_TOOL_SIGNING_SECRET set",
    ok: signingLocal,
    detail: signingLocal ? "set" : "unset",
  });
  checks.push({
    name: "local legacy AGENT_TOOL_SECRET set",
    ok: legacyLocal,
    detail: legacyLocal ? "set" : "unset",
  });

  const edgeSigning = edgeHasSigningSecret();
  checks.push({
    name: "Edge AGENT_TOOL_SIGNING_SECRET listed",
    ok: edgeSigning,
  });

  const pub = getPublicEnv();
  const base = pub.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");
  const anon = pub.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let token: string;
  try {
    token = mintAgentToolToken({ restaurantId: RESTAURANT_ID });
  } catch (e) {
    checks.push({
      name: "mint roal1 token locally",
      ok: false,
      detail: e instanceof Error ? e.message : "failed",
    });
    summarize(checks);
    process.exit(1);
  }
  checks.push({
    name: "mint roal1 token locally",
    ok: token.startsWith("roal1."),
  });

  const url = `${base}/functions/v1/get-menu?restaurant_id=${encodeURIComponent(RESTAURANT_ID)}&restaurant_name=egg%20mania`;
  const res = await fetch(url, {
    headers: {
      apikey: anon,
      Authorization: `Bearer ${token}`,
      [ROAL_RESTAURANT_ID_HEADER]: RESTAURANT_ID,
    },
    signal: AbortSignal.timeout(30000),
  });
  const json = (await res.json().catch(() => ({}))) as {
    categories?: unknown[];
    error?: string;
  };
  checks.push({
    name: "Edge get-menu accepts signed roal1 token",
    ok: res.status === 200 && Array.isArray(json.categories) && json.categories.length > 0,
    detail: `HTTP ${res.status} categories=${Array.isArray(json.categories) ? json.categories.length : 0}`,
  });

  summarize(checks);
  process.exit(checks.every((c) => c.ok) ? 0 : 1);
})().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});

function summarize(checks: { name: string; ok: boolean; detail?: string }[]) {
  let pass = 0;
  for (const c of checks) {
    if (c.ok) pass += 1;
    console.log(`[${c.ok ? "PASS" : "FAIL"}] ${c.name}${c.detail ? `: ${c.detail}` : ""}`);
  }
  console.log(`\n${pass}/${checks.length} checks passed`);
}
