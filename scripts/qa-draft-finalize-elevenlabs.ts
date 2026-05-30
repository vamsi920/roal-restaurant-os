/**
 * Prompt 19 — verify sync_draft_order + finalize_order via synced ElevenLabs tool config.
 * Usage: npx tsx --env-file=.env --env-file=.env.local scripts/qa-draft-finalize-elevenlabs.ts
 */
import { createClient } from "@supabase/supabase-js";
import {
  fetchSyncedRoalTool,
  invokeSyncedRoalTool,
} from "../lib/elevenlabs/fetch-synced-tool";
import { mintAgentToolToken } from "../lib/agent-tools/token";
import { getElevenLabsAgentId } from "../lib/env.server";
import { getPublicEnv } from "../lib/env.public";
import { ROAL_IDEMPOTENCY_HEADER } from "../lib/agent-tools/headers";
import { getServiceRoleSupabase } from "../lib/supabase/server";
import { ensureQaOrderingOpen } from "./lib/qa-ensure-ordering-open.mjs";

const RESTAURANT_ID =
  process.env.QA_RESTAURANT_ID?.trim() || "9d3263d1-4d9d-4f89-bfc5-160e2cca1855";

type DraftOrderRow = {
  status?: string;
  items?: { quantity?: number }[];
  customer_name?: string | null;
};

type ApiErr = { code?: string; error?: string };
type DraftResponse = { draft_order?: DraftOrderRow; ok?: boolean } & ApiErr;

function asDraft(json: unknown): DraftResponse {
  return (json ?? {}) as DraftResponse;
}

void (async () => {
  const sb = getServiceRoleSupabase();
  if (!sb) throw new Error("SUPABASE_SERVICE_ROLE_KEY required");

  const { data: profile } = await sb
    .from("restaurant_profiles")
    .select("elevenlabs_agent_id")
    .eq("restaurant_id", RESTAURANT_ID)
    .maybeSingle();

  const agentId =
    profile?.elevenlabs_agent_id?.trim() || getElevenLabsAgentId() || "";
  if (!agentId) throw new Error("No ElevenLabs agent id for active restaurant");

  const pub = getPublicEnv();
  const menuProbeUrl = `${pub.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "")}/functions/v1/get-menu?restaurant_id=${encodeURIComponent(RESTAURANT_ID)}&restaurant_name=qa`;
  const probeRes = await fetch(menuProbeUrl, {
    headers: {
      apikey: pub.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${mintAgentToolToken({ restaurantId: RESTAURANT_ID })}`,
    },
    signal: AbortSignal.timeout(30000),
  });
  const probeJson = (await probeRes.json().catch(() => ({}))) as {
    operations?: { ordering_allowed?: boolean };
  };
  if (probeJson.operations?.ordering_allowed === false) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && serviceKey) {
      const admin = createClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const opened = await ensureQaOrderingOpen(admin, RESTAURANT_ID);
      console.log(
        `[qa] ordering closed — opened QA window: ${opened.detail}`
      );
    }
  }

  const runId = `qa-p19-${Date.now()}`;
  const sessionId = `${runId}-flow`;
  const idemKey = `qa-p19-finalize-${runId}`;
  const checks: { name: string; ok: boolean; detail?: string }[] = [];

  const getMenuTool = await fetchSyncedRoalTool("get_menu_items", agentId);
  const menuRes = await invokeSyncedRoalTool(getMenuTool);
  const menuJson = menuRes.json as {
    categories?: { items?: { name?: string; is_available?: boolean }[] }[];
  };
  const item =
    menuJson.categories
      ?.flatMap((c) => c.items ?? [])
      .find((i) => i.is_available && i.name) ?? null;

  checks.push({
    name: "get_menu_items prelude",
    ok: menuRes.status === 200 && Boolean(item?.name),
    detail: item?.name ?? `HTTP ${menuRes.status}`,
  });
  if (!item?.name) {
    summarize(checks);
    process.exit(1);
  }

  const syncTool = await fetchSyncedRoalTool("sync_draft_order", agentId);
  const finalizeTool = await fetchSyncedRoalTool("finalize_order", agentId);

  const syncBody = {
    session_id: sessionId,
    status: "draft",
    items: [{ name: item.name, quantity: 1 }],
  };

  const sync1 = await invokeSyncedRoalTool(syncTool, syncBody);
  const sync1Draft = asDraft(sync1.json).draft_order;
  checks.push({
    name: "sync_draft_order (ElevenLabs-exact)",
    ok: sync1.status === 200 && sync1Draft?.status === "draft",
    detail: `HTTP ${sync1.status} status=${sync1Draft?.status ?? "?"}`,
  });

  const { data: draftAfterSync } = await sb
    .from("draft_orders")
    .select("status, items")
    .eq("restaurant_id", RESTAURANT_ID)
    .eq("session_id", sessionId)
    .maybeSingle();

  checks.push({
    name: "KDS draft row after sync",
    ok: draftAfterSync?.status === "draft",
    detail: draftAfterSync?.status ?? "missing",
  });

  const { data: voiceUsage } = await sb
    .from("usage_events")
    .select("event_type, idempotency_key")
    .eq("restaurant_id", RESTAURANT_ID)
    .eq("session_id", sessionId)
    .eq("event_type", "voice_order")
    .maybeSingle();

  checks.push({
    name: "usage event voice_order",
    ok: voiceUsage?.event_type === "voice_order",
    detail: voiceUsage?.idempotency_key ?? "missing",
  });

  const finalizeBody = {
    session_id: sessionId,
    customer_name: "ElevenLabs QA Guest",
    customer_phone: "4155550199",
  };

  const fin1 = await invokeSyncedRoalTool(finalizeTool, finalizeBody, {
    extraHeaders: { [ROAL_IDEMPOTENCY_HEADER]: idemKey },
  });
  const fin1Draft = asDraft(fin1.json).draft_order;
  checks.push({
    name: "finalize_order (ElevenLabs-exact)",
    ok: fin1.status === 200 && fin1Draft?.status === "new",
    detail: `HTTP ${fin1.status} status=${fin1Draft?.status ?? "?"} replay=${fin1.replay ?? "—"}`,
  });

  const { data: draftAfterFin } = await sb
    .from("draft_orders")
    .select("status, customer_name, customer_phone")
    .eq("restaurant_id", RESTAURANT_ID)
    .eq("session_id", sessionId)
    .maybeSingle();

  checks.push({
    name: "KDS queue row after finalize",
    ok: draftAfterFin?.status === "new",
    detail: draftAfterFin?.status ?? "missing",
  });

  const { data: receipt } = await sb
    .from("phone_order_receipts")
    .select("id, customer_name")
    .eq("restaurant_id", RESTAURANT_ID)
    .eq("session_id", sessionId)
    .maybeSingle();

  checks.push({
    name: "phone_order_receipts row",
    ok: Boolean(receipt?.id),
    detail: receipt?.customer_name ?? "missing",
  });

  const { data: completedUsage } = await sb
    .from("usage_events")
    .select("event_type, idempotency_key")
    .eq("restaurant_id", RESTAURANT_ID)
    .eq("session_id", sessionId)
    .eq("event_type", "order_completed")
    .maybeSingle();

  checks.push({
    name: "usage event order_completed",
    ok: completedUsage?.event_type === "order_completed",
    detail: completedUsage?.idempotency_key ?? "missing",
  });

  const fin2 = await invokeSyncedRoalTool(finalizeTool, finalizeBody, {
    extraHeaders: { [ROAL_IDEMPOTENCY_HEADER]: idemKey },
  });
  checks.push({
    name: "finalize idempotency replay",
    ok: fin2.status === 200 && fin2.replay === "true",
    detail: `HTTP ${fin2.status} replay=${fin2.replay ?? "missing"}`,
  });

  const zodBad = await invokeSyncedRoalTool(finalizeTool, {
    session_id: `${runId}-zod`,
    customer_name: "",
    customer_phone: "",
  });
  const zodJson = asDraft(zodBad.json);
  checks.push({
    name: "reject empty customer (Zod)",
    ok: zodBad.status === 400 && zodJson.code === "validation_failed",
    detail: `HTTP ${zodBad.status} code=${zodJson.code ?? "?"}`,
  });

  const phSession = `${runId}-placeholder`;
  await invokeSyncedRoalTool(syncTool, {
    session_id: phSession,
    status: "draft",
    items: [{ name: item.name, quantity: 1 }],
  });
  const phBad = await invokeSyncedRoalTool(finalizeTool, {
    session_id: phSession,
    customer_name: "John Doe",
    customer_phone: "555-000-0000",
  });
  const phJson = asDraft(phBad.json);
  checks.push({
    name: "reject placeholder customer",
    ok: phBad.status === 400 && phJson.code === "customer_validation_failed",
    detail: `HTTP ${phBad.status} code=${phJson.code ?? "?"}`,
  });

  console.log(
    JSON.stringify(
      {
        restaurant_id: RESTAURANT_ID,
        agent_id: agentId,
        session_id: sessionId,
        idempotency_key: idemKey,
        sync_url_path: syncTool.url.replace(/https:\/\/[^/]+/, ""),
        finalize_url_path: finalizeTool.url.replace(/https:\/\/[^/]+/, ""),
      },
      null,
      2
    )
  );

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
