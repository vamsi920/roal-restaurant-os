/**
 * Prompt 16 — LB-01 production phone stack verification.
 * Simulates ElevenLabs get_menu_items with synced tool URL/headers; checks app URL, conversation-init, baked tools.
 * Usage: npx tsx --env-file=.env --env-file=.env.local scripts/qa-lb01-phone-stack.ts
 */
import dns from "node:dns/promises";
import {
  elevenlabsFetch,
  getConvaiAgent,
  listAllConvaiTools,
} from "../lib/elevenlabs";
import { readElevenLabsPhonePersonalizationWebhook } from "../lib/elevenlabs/phone-personalization";
import { getPublicEnv } from "../lib/env.public";
import {
  getElevenLabsAgentId,
  getElevenLabsConversationInitSecret,
} from "../lib/env.server";
import {
  conversationInitAbsoluteUrl,
  ELEVENLABS_CONVERSATION_INIT_PATH,
  getSiteOrigin,
  parseUrlHost,
  resolveLocalDevOrigin,
  webhookHostMatchesAppOrigin,
} from "../lib/site-url";
import { ROAL_RESTAURANT_ID_HEADER } from "../lib/sync-elevenlabs-roal-tools";
import { getDb } from "../lib/supabase/server";

const RESTAURANT_ID =
  process.env.QA_RESTAURANT_ID?.trim() || "9d3263d1-4d9d-4f89-bfc5-160e2cca1855";
const TOOL_NAMES = [
  "get_menu_items",
  "get_restaurant_info",
  "get_caller_history",
  "submit_reservation_request",
  "sync_draft_order",
  "finalize_order",
  "get_order_status",
] as const;

type Check = { name: string; ok: boolean; detail?: string; url?: string };

function formatProbeFailure(label: string, url: string, status: number, error?: string): string {
  const suffix = error ? ` (${error})` : "";
  return `${label} ${redactUrl(url)} -> HTTP ${status}${suffix}`;
}

function redactUrl(u: string): string {
  try {
    const url = new URL(u);
    if (url.searchParams.has("secret")) {
      url.searchParams.set("secret", "[redacted]");
    }
    return url.toString();
  } catch {
    return u.replace(/secret=[^&]+/gi, "secret=[redacted]");
  }
}

function refFromUrl(u: string): string | null {
  const m = u.match(/https:\/\/([a-z0-9]+)\.supabase\.co/i);
  return m?.[1] ?? null;
}

async function resolveHost(hostname: string): Promise<boolean> {
  try {
    await dns.lookup(hostname);
    return true;
  } catch {
    return false;
  }
}

async function httpProbe(url: string, init?: RequestInit): Promise<{ ok: boolean; status: number }> {
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(15000) });
    return { ok: res.ok || res.status === 401, status: res.status };
  } catch {
    return { ok: false, status: 0 };
  }
}

async function resolveDedicatedInitAgentId(
  templateAgentId: string
): Promise<{ agentId: string; source: string }> {
  const override =
    process.env.QA_DEDICATED_AGENT_ID?.trim() ||
    process.env.QA_ELEVENLABS_AGENT_ID?.trim();
  if (override) {
    return { agentId: override, source: "QA_DEDICATED_AGENT_ID" };
  }

  const supabase = getDb();
  if (supabase) {
    const { data } = await supabase
      .from("restaurant_profiles")
      .select("elevenlabs_agent_id")
      .eq("restaurant_id", RESTAURANT_ID)
      .maybeSingle();
    const dedicated = data?.elevenlabs_agent_id?.trim();
    if (dedicated && dedicated !== templateAgentId) {
      return { agentId: dedicated, source: "restaurant_profiles.elevenlabs_agent_id" };
    }
  }

  return { agentId: templateAgentId, source: "ELEVENLABS_AGENT_ID (template)" };
}

async function fetchSyncedTool(name: (typeof TOOL_NAMES)[number]) {
  const agentId = getElevenLabsAgentId();
  if (!agentId) throw new Error("ELEVENLABS_AGENT_ID required");

  const listed = await listAllConvaiTools();
  const row = listed.find((t) => t.tool_config?.name === name);
  if (!row?.id) throw new Error(`Tool ${name} not found on ElevenLabs account`);

  const res = await elevenlabsFetch(
    `/v1/convai/tools/${encodeURIComponent(row.id)}`,
    { method: "GET" }
  );
  const data = (await res.json()) as { tool_config?: Record<string, unknown> };
  const cfg = (data.tool_config ?? data) as Record<string, unknown>;
  const schema = (cfg.api_schema ?? {}) as Record<string, unknown>;
  return {
    id: row.id,
    url: String(schema.url ?? ""),
    method: String(schema.method ?? "GET").toUpperCase(),
    headers: (schema.request_headers ?? {}) as Record<string, string>,
  };
}

void (async () => {
  const checks: Check[] = [];
  const origin = getSiteOrigin();
  const expectedInitPath = ELEVENLABS_CONVERSATION_INIT_PATH;
  const expectedInitBase = conversationInitAbsoluteUrl();
  const agentId = getElevenLabsAgentId() ?? "";
  const pub = getPublicEnv();
  const expectedRef = refFromUrl(pub.NEXT_PUBLIC_SUPABASE_URL ?? "");

  // 1. App URL configured
  checks.push({
    name: "app URL configured (NEXT_PUBLIC_APP_URL or VERCEL_URL)",
    ok: Boolean(origin),
    detail: origin
      ? redactUrl(origin)
      : "unset — set NEXT_PUBLIC_APP_URL on production host",
  });

  // 2. DNS for configured production host
  let prodDnsOk = false;
  if (origin) {
    try {
      const host = new URL(origin).hostname;
      prodDnsOk = await resolveHost(host);
      checks.push({
        name: `production host DNS resolves (${host})`,
        ok: prodDnsOk,
        detail: prodDnsOk ? "lookup ok" : "NXDOMAIN or unreachable from this host",
      });
    } catch {
      checks.push({
        name: "production host DNS resolves",
        ok: false,
        detail: "invalid NEXT_PUBLIC_APP_URL",
      });
    }
  }

  // 3. HTTP reachability (prod if DNS ok)
  if (origin && prodDnsOk) {
    const probe = await httpProbe(origin);
    checks.push({
      name: "production app HTTP reachable",
      ok: probe.ok,
      detail: `HTTP ${probe.status}`,
    });
  } else if (origin) {
    checks.push({
      name: "production app HTTP reachable",
      ok: false,
      detail: "skipped — DNS failed",
    });
  }

  // 4. ElevenLabs phone personalization webhook
  if (agentId) {
    const phone = await readElevenLabsPhonePersonalizationWebhook(agentId);
    const expectedHost = parseUrlHost(origin ?? null);
    const hookHost = parseUrlHost(phone.url);
    const alignment = webhookHostMatchesAppOrigin({
      webhookUrl: phone.url,
      appOrigin: origin ?? null,
    });
    checks.push({
      name: "ElevenLabs personalization webhook enabled",
      ok: phone.enabled === true,
    });
    checks.push({
      name: "personalization webhook URL host matches NEXT_PUBLIC_APP_URL",
      ok: Boolean(
        phone.url &&
          phone.url.includes(expectedInitPath) &&
          alignment.aligned
      ),
      detail: phone.url
        ? alignment.aligned
          ? redactUrl(phone.url)
          : `webhook host ${hookHost ?? "?"} != app host ${expectedHost ?? "?"} (expected ${origin ? redactUrl(conversationInitAbsoluteUrl() ?? origin) : "NEXT_PUBLIC_APP_URL"})`
        : "no url on agent — re-sync dedicated agent",
      url: phone.url ? redactUrl(phone.url) : undefined,
    });
  }

  // 5. Baked tools on agent (all phone-safe)
  const agentRaw = agentId ? await getConvaiAgent(agentId) : null;
  const toolIds: string[] =
    agentRaw &&
    typeof agentRaw === "object" &&
    Array.isArray(
      (
        agentRaw as {
          conversation_config?: { agent?: { prompt?: { tool_ids?: unknown } } };
        }
      ).conversation_config?.agent?.prompt?.tool_ids
    )
      ? ((agentRaw as {
          conversation_config: { agent: { prompt: { tool_ids: string[] } } };
        }).conversation_config.agent.prompt.tool_ids)
      : [];

  for (const name of TOOL_NAMES) {
    const tool = await fetchSyncedTool(name);
    const urlRef = refFromUrl(tool.url);
    const ridHeader = tool.headers[ROAL_RESTAURANT_ID_HEADER];
    const baked =
      name === "get_menu_items"
        ? tool.url.includes(`restaurant_id=${encodeURIComponent(RESTAURANT_ID)}`) &&
          ridHeader === RESTAURANT_ID
        : ridHeader === RESTAURANT_ID;

    checks.push({
      name: `${name}: baked + Supabase ref match`,
      ok: baked && urlRef === expectedRef,
      detail: baked ? `ref=${urlRef}` : "not baked to QA restaurant",
    });
    checks.push({
      name: `${name}: attached on agent prompt`,
      ok: toolIds.includes(tool.id),
    });
  }

  // 6. Simulate get_menu_items exactly as ElevenLabs (synced URL + headers)
  const getMenu = await fetchSyncedTool("get_menu_items");
  const menuRes = await fetch(getMenu.url, {
    method: getMenu.method,
    headers: getMenu.headers,
    signal: AbortSignal.timeout(45000),
  });
  const menuJson = (await menuRes.json().catch(() => ({}))) as {
    categories?: unknown[];
    restaurant?: { name?: string };
    error?: string;
  };
  const catCount = Array.isArray(menuJson.categories)
    ? menuJson.categories.length
    : 0;
  checks.push({
    name: "get_menu_items (ElevenLabs-exact simulation)",
    ok: menuRes.status === 200 && catCount >= 1,
    detail: `HTTP ${menuRes.status}, categories=${catCount}`,
  });

  // 7. conversation-init route (local fallback when prod DNS fails)
  const initSecret = getElevenLabsConversationInitSecret();
  const { agentId: initAgentId, source: initAgentSource } =
    await resolveDedicatedInitAgentId(agentId);

  if (initAgentId === agentId && agentId) {
    checks.push({
      name: "conversation-init probe uses dedicated agent id",
      ok: false,
      detail:
        "ELEVENLABS_AGENT_ID is the shared template — provision or set QA_DEDICATED_AGENT_ID / restaurant_profiles.elevenlabs_agent_id",
    });
  } else {
    checks.push({
      name: "conversation-init probe uses dedicated agent id",
      ok: true,
      detail: initAgentSource,
    });
  }

  const initTargets: { label: string; base: string }[] = [];
  if (origin && prodDnsOk && expectedInitBase) {
    initTargets.push({ label: "production", base: expectedInitBase });
  }
  initTargets.push({
    label: "local-dev",
    base: conversationInitAbsoluteUrl(resolveLocalDevOrigin()) ?? `${resolveLocalDevOrigin()}${expectedInitPath}`,
  });

  let initPass = false;
  let initDetail = "no target responded";
  const initAttempts: string[] = [];
  for (const target of initTargets) {
    const u = new URL(target.base);
    if (initSecret) u.searchParams.set("secret", initSecret);
    u.searchParams.set("agent_id", initAgentId);
    const probe = await httpProbe(u.toString());
    if (!probe.ok && probe.status === 0) {
      initAttempts.push(formatProbeFailure(target.label, u.toString(), 0, "unreachable"));
      continue;
    }

    const res = await fetch(u.toString(), { signal: AbortSignal.timeout(15000) });
    const body = (await res.json().catch(() => ({}))) as {
      type?: string;
      dynamic_variables?: Record<string, string>;
      error?: string;
    };
    const vars = body.dynamic_variables ?? {};
    const ok =
      res.status === 200 &&
      body.type === "conversation_initiation_client_data" &&
      vars.restaurant_id === RESTAURANT_ID;
    if (ok) {
      initPass = true;
      initDetail = `${target.label} ${redactUrl(u.toString())} -> HTTP 200, restaurant_id match`;
      break;
    }
    initAttempts.push(
      formatProbeFailure(target.label, u.toString(), res.status, body.error)
    );
    initDetail = initAttempts[initAttempts.length - 1] ?? initDetail;
  }

  if (!initPass && initAttempts.length > 1) {
    initDetail = initAttempts.join(" | ");
  }

  checks.push({
    name: "conversation-init returns restaurant vars",
    ok: initPass,
    detail: initDetail,
  });

  // Summary
  let pass = 0;
  for (const c of checks) {
    const mark = c.ok ? "PASS" : "FAIL";
    if (c.ok) pass += 1;
    const urlSuffix = c.url && !c.detail?.includes(c.url) ? ` url=${c.url}` : "";
    console.log(`[${mark}] ${c.name}${c.detail ? `: ${c.detail}` : ""}${urlSuffix}`);
  }

  const automatedOk = checks
    .filter((c) => !c.name.includes("production host DNS") && !c.name.includes("production app HTTP"))
    .every((c) => c.ok);

  const humanSteps: string[] = [];
  if (!prodDnsOk && origin) {
    humanSteps.push(
      `Point ${new URL(origin).hostname} DNS to production hosting (Vercel/etc.) so ElevenLabs personalization webhook is reachable on inbound Twilio calls.`
    );
  }
  if (prodDnsOk) {
    humanSteps.push(
      "Place one test Twilio call; confirm ElevenLabs conversation log shows get_menu_items HTTP 200."
    );
  } else {
    humanSteps.push(
      "After DNS is live: re-run this script, then one test Twilio call with get_menu_items log check."
    );
  }

  console.log("\n--- LB-01 status ---");
  console.log(
    JSON.stringify(
      {
        automated_layers: automatedOk ? "pass" : "partial",
        prod_dns: prodDnsOk,
        expected_conversation_init_url: expectedInitBase
          ? redactUrl(expectedInitBase)
          : null,
        local_dev_origin: resolveLocalDevOrigin(),
        get_menu_simulation: menuRes.status,
        categories: catCount,
        lb01_closeable: automatedOk && prodDnsOk,
        remaining_human_steps: humanSteps,
      },
      null,
      2
    )
  );

  console.log(`\n${pass}/${checks.length} checks passed`);
  if (!automatedOk) process.exit(1);
})().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
