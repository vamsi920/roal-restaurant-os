/**
 * Prompt 15 — voice agent Connect / Re-sync parity (same libs as KDS panel).
 * Usage: npx tsx --env-file=.env --env-file=.env.local scripts/qa-voice-agent-panel.ts
 */
import { applyRestaurantOrderAgentProfile } from "../lib/elevenlabs-restaurant-agent-profile";
import {
  applyElevenLabsPhonePersonalizationWebhook,
  buildConversationInitWebhookUrl,
} from "../lib/elevenlabs/phone-personalization";
import { getConvaiAgent } from "../lib/elevenlabs";
import {
  firstMessageHasUnresolvedTemplates,
  readAgentFirstMessage,
} from "../lib/elevenlabs-placeholders";
import { getElevenLabsAgentId, getElevenLabsConversationInitSecret } from "../lib/env.server";
import { syncRoalElevenLabsTools } from "../lib/sync-elevenlabs-roal-tools";
import { getServiceRoleSupabase } from "../lib/supabase/server";

const RESTAURANT_ID =
  process.env.QA_RESTAURANT_ID?.trim() || "9d3263d1-4d9d-4f89-bfc5-160e2cca1855";
const RESTAURANT_NAME = process.env.QA_RESTAURANT_NAME?.trim() || "egg mania";

function redactSecrets(text: string): string {
  return text
    .replace(/secret=[^&\s"']+/gi, "secret=[redacted]")
    .replace(/\bsk-[a-zA-Z0-9]{16,}\b/g, "[redacted]")
    .replace(/\broal1\.[a-zA-Z0-9._-]+/gi, "[redacted]");
}

type Check = { name: string; ok: boolean; detail?: string };

async function runSyncPass(label: string) {
  const agentId =
    process.env.ELEVENLABS_AGENT_ID?.trim() || getElevenLabsAgentId() || "";
  if (!agentId) throw new Error("ELEVENLABS_AGENT_ID required");

  const sync = await syncRoalElevenLabsTools({
    agentId,
    restaurantId: RESTAURANT_ID,
    restaurantName: RESTAURANT_NAME,
  });
  const profile = await applyRestaurantOrderAgentProfile({
    agentId,
    restaurantId: RESTAURANT_ID,
    restaurantName: RESTAURANT_NAME,
  });

  let phoneWebhook: string | null = null;
  const initSecret = getElevenLabsConversationInitSecret();
  const webhookUrl = buildConversationInitWebhookUrl(initSecret);
  if (webhookUrl) {
    const phone = await applyElevenLabsPhonePersonalizationWebhook({
      agentId,
      webhookUrl,
      initSecret,
    });
    phoneWebhook = phone.webhook_url;
  }

  const sb = getServiceRoleSupabase();
  if (!sb) throw new Error("SUPABASE_SERVICE_ROLE_KEY required");

  const summary = {
    tools: sync.tools,
    tool_ids_on_agent: sync.tool_ids_on_agent,
    restaurant_placeholders_updated:
      sync.restaurant_placeholders_updated ||
      profile.restaurant_placeholders_updated,
    first_message_updated: sync.first_message_updated,
    restaurant_tools_baked: sync.restaurant_tools_baked,
    knowledge_base_doc_attached: profile.knowledge_base_doc_attached,
    phone_personalization_webhook: phoneWebhook,
  };

  const now = new Date().toISOString();
  const { error } = await sb
    .from("restaurant_profiles")
    .update({
      elevenlabs_agent_id: agentId,
      elevenlabs_provision_status: "ready",
      elevenlabs_provision_error: null,
      elevenlabs_provisioned_at: now,
      elevenlabs_menu_auto_sync_status: "succeeded",
      elevenlabs_menu_auto_sync_error: null,
      elevenlabs_last_sync_at: now,
      elevenlabs_last_sync_error: null,
      elevenlabs_last_sync_summary: summary,
      updated_at: now,
    })
    .eq("restaurant_id", RESTAURANT_ID);
  if (error) throw new Error(error.message);

  return { label, agentId, sync, summary };
}

void (async () => {
  const checks: Check[] = [];

  const connect = await runSyncPass("connect");
  checks.push({
    name: "connect: tools synced",
    ok: connect.sync.tools.length >= 5,
    detail: `${connect.sync.tools.length} tools`,
  });
  checks.push({
    name: "connect: restaurant_tools_baked",
    ok: connect.sync.restaurant_tools_baked === true,
  });
  checks.push({
    name: "connect: tool_ids on agent",
    ok: connect.sync.tool_ids_on_agent.length >= 5,
    detail: `${connect.sync.tool_ids_on_agent.length} ids`,
  });

  const sb = getServiceRoleSupabase();
  const { data: row, error: loadErr } = await sb!
    .from("restaurant_profiles")
    .select(
      "elevenlabs_agent_id,elevenlabs_provision_status,elevenlabs_provisioned_at,elevenlabs_last_sync_at,elevenlabs_last_sync_error,elevenlabs_last_sync_summary"
    )
    .eq("restaurant_id", RESTAURANT_ID)
    .maybeSingle();

  if (loadErr) throw new Error(loadErr.message);

  checks.push({
    name: "profile: agent id persisted",
    ok: row?.elevenlabs_agent_id === connect.agentId,
  });
  checks.push({
    name: "profile: last_sync_error cleared",
    ok: row?.elevenlabs_last_sync_error == null,
  });
  checks.push({
    name: "profile: provision_status ready",
    ok: row?.elevenlabs_provision_status === "ready",
  });
  checks.push({
    name: "profile: provisioned_at set",
    ok: Boolean(row?.elevenlabs_provisioned_at),
  });
  const summary = row?.elevenlabs_last_sync_summary as {
    restaurant_tools_baked?: boolean;
    tools?: { name: string }[];
  } | null;
  checks.push({
    name: "profile: summary tools baked",
    ok: summary?.restaurant_tools_baked === true,
  });

  const resync = await runSyncPass("resync");
  checks.push({
    name: "resync: second pass ok",
    ok: resync.sync.ok === true && resync.sync.restaurant_tools_baked === true,
  });

  const agent = await getConvaiAgent(connect.agentId);
  const firstMessage = readAgentFirstMessage(agent);
  checks.push({
    name: "agent: first_message literal (no templates)",
    ok: !firstMessageHasUnresolvedTemplates(firstMessage),
  });

  let pass = 0;
  for (const c of checks) {
    const mark = c.ok ? "PASS" : "FAIL";
    if (c.ok) pass += 1;
  console.log(
      `[${mark}] ${c.name}${c.detail ? `: ${c.detail}` : ""}`
    );
  }

  console.log(
    redactSecrets(
      JSON.stringify(
        {
          restaurant_id: RESTAURANT_ID,
          agent_id: connect.agentId,
          last_sync_at: row?.elevenlabs_last_sync_at,
          tool_names: summary?.tools?.map((t) => t.name) ?? [],
        },
        null,
        2
      )
    )
  );

  console.log(`\n${pass}/${checks.length} checks passed`);
  if (pass !== checks.length) process.exit(1);
})().catch((e) => {
  console.error(redactSecrets(e instanceof Error ? e.message : String(e)));
  process.exit(1);
});
