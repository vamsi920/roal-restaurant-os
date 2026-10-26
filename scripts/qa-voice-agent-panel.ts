/**
 * Prompt 15 — voice agent Connect / Re-sync parity (same libs as KDS panel).
 * Usage: npx tsx --env-file=.env --env-file=.env.local scripts/qa-voice-agent-panel.ts
 */
import { getConvaiAgent } from "../lib/elevenlabs";
import {
  firstMessageHasUnresolvedTemplates,
  readAgentFirstMessage,
} from "../lib/elevenlabs-placeholders";
import { getElevenLabsAgentId } from "../lib/env.server";
import {
  defaultProvisionRestaurantVoiceAgentDeps,
  provisionRestaurantVoiceAgent,
} from "../lib/voice-agent/provision-restaurant-voice-agent";
import { resolveDedicatedElevenLabsAgentId } from "../lib/voice-agent/dedicated-agent-id";
import { runRestaurantVoiceAgentSync } from "../lib/voice-agent/run-restaurant-voice-agent-sync";
import {
  loadProfileVoiceState,
  redactSecrets,
  requireServiceRoleSupabase,
  resolveQaRestaurant,
  resolveQaUserId,
} from "../lib/voice-agent/qa/live-helpers";

type Check = { name: string; ok: boolean; detail?: string };

async function ensureDedicatedAgentId(): Promise<{
  restaurantId: string;
  restaurantName: string;
  organizationId: string;
  agentId: string;
}> {
  const sb = requireServiceRoleSupabase();
  const ctx = await resolveQaRestaurant(sb);
  const userId = resolveQaUserId();
  const profile = await loadProfileVoiceState(sb, ctx.restaurantId);
  const templateId = getElevenLabsAgentId();
  const existing = resolveDedicatedElevenLabsAgentId(
    profile?.elevenlabs_agent_id,
    templateId
  );

  if (existing) {
    return {
      restaurantId: ctx.restaurantId,
      restaurantName: ctx.restaurantName,
      organizationId: ctx.organizationId,
      agentId: existing,
    };
  }

  const result = await provisionRestaurantVoiceAgent(
    ctx.restaurantId,
    ctx.restaurantName,
    ctx.organizationId,
    userId,
    {
      ...defaultProvisionRestaurantVoiceAgentDeps(),
      getSupabase: async () => sb,
    }
  );

  if (!result.ok) {
    throw new Error(result.error);
  }

  return {
    restaurantId: ctx.restaurantId,
    restaurantName: ctx.restaurantName,
    organizationId: ctx.organizationId,
    agentId: result.agentId,
  };
}

async function runSyncPass(
  label: string,
  input: {
    agentId: string;
    restaurantId: string;
    restaurantName: string;
    organizationId: string;
  }
) {
  const { sync, profile, summary } = await runRestaurantVoiceAgentSync({
    agentId: input.agentId,
    restaurantId: input.restaurantId,
    restaurantName: input.restaurantName,
  });

  const sb = requireServiceRoleSupabase();
  const now = new Date().toISOString();
  const { error } = await sb
    .from("restaurant_profiles")
    .update({
      elevenlabs_agent_id: input.agentId,
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
    .eq("restaurant_id", input.restaurantId);
  if (error) throw new Error(error.message);

  return { label, agentId: input.agentId, sync, profile, summary };
}

void (async () => {
  const checks: Check[] = [];
  const ctx = await ensureDedicatedAgentId();
  const templateId = getElevenLabsAgentId();

  checks.push({
    name: "agent: dedicated (not template)",
    ok:
      Boolean(resolveDedicatedElevenLabsAgentId(ctx.agentId, templateId)) &&
      ctx.agentId !== templateId,
    detail: ctx.agentId,
  });

  const connect = await runSyncPass("connect", ctx);
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

  const sb = requireServiceRoleSupabase();
  const { data: row, error: loadErr } = await sb
    .from("restaurant_profiles")
    .select(
      "elevenlabs_agent_id,elevenlabs_provision_status,elevenlabs_provisioned_at,elevenlabs_last_sync_at,elevenlabs_last_sync_error,elevenlabs_last_sync_summary"
    )
    .eq("restaurant_id", ctx.restaurantId)
    .maybeSingle();

  if (loadErr) throw new Error(loadErr.message);

  checks.push({
    name: "profile: agent id persisted",
    ok: row?.elevenlabs_agent_id === connect.agentId,
  });
  checks.push({
    name: "profile: not shared template",
    ok: row?.elevenlabs_agent_id !== templateId,
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

  const resync = await runSyncPass("resync", ctx);
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
          restaurant_id: ctx.restaurantId,
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
