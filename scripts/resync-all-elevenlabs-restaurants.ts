/**
 * Prompt 17 — list + re-sync every restaurant with a saved ElevenLabs agent id.
 * Verifies baked tools, headers, first message, conversation-init webhook (secrets redacted).
 *
 * Usage:
 *   npx tsx --env-file=.env --env-file=.env.local scripts/resync-all-elevenlabs-restaurants.ts
 *   npx tsx --env-file=.env --env-file=.env.local scripts/resync-all-elevenlabs-restaurants.ts --list-only
 */
import { applyRestaurantOrderAgentProfile } from "../lib/elevenlabs-restaurant-agent-profile";
import {
  applyElevenLabsPhonePersonalizationWebhook,
  buildConversationInitWebhookUrl,
  readElevenLabsPhonePersonalizationWebhook,
} from "../lib/elevenlabs/phone-personalization";
import {
  elevenlabsFetch,
  getConvaiAgent,
  listAllConvaiTools,
} from "../lib/elevenlabs";
import {
  firstMessageHasUnresolvedTemplates,
  readAgentFirstMessage,
} from "../lib/elevenlabs-placeholders";
import { getPublicEnv } from "../lib/env.public";
import { getElevenLabsConversationInitSecret } from "../lib/env.server";
import { absoluteUrl } from "../lib/site-url";
import {
  syncRoalElevenLabsTools,
  ROAL_RESTAURANT_ID_HEADER,
} from "../lib/sync-elevenlabs-roal-tools";
import { getServiceRoleSupabase } from "../lib/supabase/server";

const TOOL_NAMES = ["get_menu_items", "sync_draft_order", "finalize_order"] as const;
const LIST_ONLY = process.argv.includes("--list-only");

type RestaurantRow = {
  restaurant_id: string;
  name: string;
  elevenlabs_agent_id: string;
};

function redactUrl(u: string): string {
  try {
    const url = new URL(u);
    if (url.searchParams.has("secret")) url.searchParams.set("secret", "[redacted]");
    return url.toString();
  } catch {
    return u.replace(/secret=[^&]+/gi, "secret=[redacted]");
  }
}

function refFromUrl(u: string): string | null {
  const m = u.match(/https:\/\/([a-z0-9]+)\.supabase\.co/i);
  return m?.[1] ?? null;
}

function redactHeaderValue(v: unknown): { present: boolean; baked?: boolean } {
  if (typeof v !== "string" || !v.trim()) return { present: false };
  return { present: true, baked: v.length > 0 };
}

async function listConfigured(): Promise<RestaurantRow[]> {
  const sb = getServiceRoleSupabase();
  if (!sb) throw new Error("SUPABASE_SERVICE_ROLE_KEY required");

  const { data: profiles, error } = await sb
    .from("restaurant_profiles")
    .select("restaurant_id, elevenlabs_agent_id")
    .not("elevenlabs_agent_id", "is", null);

  if (error) throw new Error(error.message);

  const rows = (profiles ?? []).filter(
    (p): p is { restaurant_id: string; elevenlabs_agent_id: string } =>
      typeof p.elevenlabs_agent_id === "string" && p.elevenlabs_agent_id.trim().length > 0
  );

  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.restaurant_id);
  const { data: rests } = await sb.from("restaurants").select("id, name").in("id", ids);
  const nameById = new Map((rests ?? []).map((r) => [r.id, r.name ?? ""]));

  return rows.map((r) => ({
    restaurant_id: r.restaurant_id,
    name: nameById.get(r.restaurant_id) ?? "",
    elevenlabs_agent_id: r.elevenlabs_agent_id.trim(),
  }));
}

async function resyncRestaurant(row: RestaurantRow) {
  const { restaurant_id: restaurantId, name: restaurantName, elevenlabs_agent_id: agentId } =
    row;

  const sync = await syncRoalElevenLabsTools({
    agentId,
    restaurantId,
    restaurantName,
  });
  const profile = await applyRestaurantOrderAgentProfile({
    agentId,
    restaurantId,
    restaurantName,
  });

  let phoneWebhook: string | null = null;
  const webhookUrl = buildConversationInitWebhookUrl(
    getElevenLabsConversationInitSecret()
  );
  if (webhookUrl) {
    const phone = await applyElevenLabsPhonePersonalizationWebhook({
      agentId,
      webhookUrl,
    });
    phoneWebhook = phone.webhook_url;
  }

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

  const sb = getServiceRoleSupabase();
  if (!sb) throw new Error("SUPABASE_SERVICE_ROLE_KEY required");

  const { error } = await sb
    .from("restaurant_profiles")
    .update({
      elevenlabs_agent_id: agentId,
      elevenlabs_last_sync_at: new Date().toISOString(),
      elevenlabs_last_sync_error: null,
      elevenlabs_last_sync_summary: summary,
      updated_at: new Date().toISOString(),
    })
    .eq("restaurant_id", restaurantId);

  if (error) throw new Error(error.message);

  return { sync, summary, phoneWebhook };
}

async function verifyRestaurantTools(row: RestaurantRow) {
  const pub = getPublicEnv();
  const expectedRef = refFromUrl(pub.NEXT_PUBLIC_SUPABASE_URL ?? "");
  const { restaurant_id: rid, elevenlabs_agent_id: agentId } = row;

  const agent = (await getConvaiAgent(agentId)) as {
    conversation_config?: { agent?: { prompt?: { tool_ids?: string[] } } };
  };
  const toolIds = agent.conversation_config?.agent?.prompt?.tool_ids ?? [];
  const firstMessage = readAgentFirstMessage(agent);
  const phone = await readElevenLabsPhonePersonalizationWebhook(agentId);
  const initPath = "/api/integrations/elevenlabs/conversation-init";
  const expectedInit = absoluteUrl(initPath);

  const listed = await listAllConvaiTools();
  const byName = new Map<string, string>();
  for (const t of listed) {
    const n = t.tool_config?.name;
    if (n && (TOOL_NAMES as readonly string[]).includes(n)) byName.set(n, t.id);
  }

  const toolChecks: Record<string, unknown> = {};
  let allToolsOk = true;

  for (const name of TOOL_NAMES) {
    const id = byName.get(name);
    if (!id) {
      toolChecks[name] = { ok: false, error: "missing tool" };
      allToolsOk = false;
      continue;
    }

    const res = await elevenlabsFetch(
      `/v1/convai/tools/${encodeURIComponent(id)}`,
      { method: "GET" }
    );
    const data = (await res.json()) as { tool_config?: Record<string, unknown> };
    const schema = ((data.tool_config ?? data) as Record<string, unknown>)
      .api_schema as Record<string, unknown> | undefined;
    const url = String(schema?.url ?? "");
    const headers = (schema?.request_headers ?? {}) as Record<string, string>;
    const ridHeader = headers[ROAL_RESTAURANT_ID_HEADER];
    const baked =
      name === "get_menu_items"
        ? url.includes(`restaurant_id=${encodeURIComponent(rid)}`) &&
          ridHeader === rid
        : ridHeader === rid;

    const ok =
      baked &&
      refFromUrl(url) === expectedRef &&
      toolIds.includes(id) &&
      Boolean(headers.apikey) &&
      Boolean(headers.Authorization);

    if (!ok) allToolsOk = false;
    toolChecks[name] = {
      ok,
      onAgent: toolIds.includes(id),
      urlPath: url.replace(/https:\/\/[^/]+/, ""),
      refMatch: refFromUrl(url) === expectedRef,
      headers: {
        apikey: redactHeaderValue(headers.apikey),
        Authorization: redactHeaderValue(headers.Authorization),
        [ROAL_RESTAURANT_ID_HEADER]: {
          baked: ridHeader === rid,
          matchesRestaurant: ridHeader === rid,
        },
      },
    };
  }

  const phoneOk =
    phone.enabled &&
    Boolean(phone.url?.includes(initPath)) &&
    (!expectedInit || phone.url?.startsWith(expectedInit.split("?")[0] ?? ""));

  return {
    ok:
      allToolsOk &&
      !firstMessageHasUnresolvedTemplates(firstMessage) &&
      phoneOk,
    first_message_ok: !firstMessageHasUnresolvedTemplates(firstMessage),
    phone: {
      enabled: phone.enabled,
      url: phone.url ? redactUrl(phone.url) : null,
      pathMatch: Boolean(phone.url?.includes(initPath)),
    },
    tools: toolChecks,
  };
}

void (async () => {
  const configured = await listConfigured();

  console.log(
    JSON.stringify(
      {
        configured_count: configured.length,
        restaurants: configured.map((r) => ({
          restaurant_id: r.restaurant_id,
          name: r.name,
          agent_id: r.elevenlabs_agent_id,
        })),
      },
      null,
      2
    )
  );

  if (LIST_ONLY) return;

  if (configured.length === 0) {
    console.log("\nNo restaurants with elevenlabs_agent_id — nothing to re-sync.");
    return;
  }

  const results: Record<string, unknown>[] = [];
  let failures = 0;

  for (const row of configured) {
    console.log(`\n--- Re-sync: ${row.name} (${row.restaurant_id}) ---`);
    try {
      const syncResult = await resyncRestaurant(row);
      const verify = await verifyRestaurantTools(row);
      const entry = {
        restaurant_id: row.restaurant_id,
        name: row.name,
        agent_id: row.elevenlabs_agent_id,
        sync_ok: syncResult.sync.ok,
        restaurant_tools_baked: syncResult.sync.restaurant_tools_baked,
        verify_ok: verify.ok,
        first_message_ok: verify.first_message_ok,
        phone: verify.phone,
        tools: verify.tools,
      };
      results.push(entry);
      console.log(JSON.stringify(entry, null, 2));
      if (!verify.ok) failures += 1;
    } catch (e) {
      failures += 1;
      const message = e instanceof Error ? e.message : String(e);
      console.error(`[FAIL] ${row.name}: ${message.replace(/secret=[^&\s]+/gi, "secret=[redacted]")}`);
      results.push({
        restaurant_id: row.restaurant_id,
        name: row.name,
        error: message.slice(0, 200),
      });
    }
  }

  console.log(
    `\n--- Summary: ${configured.length - failures}/${configured.length} restaurants verified ---`
  );
  if (failures > 0) process.exit(1);
})().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
