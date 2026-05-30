import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { applyRestaurantOrderAgentProfile } from "../lib/elevenlabs-restaurant-agent-profile";
import {
  applyElevenLabsPhonePersonalizationWebhook,
  buildConversationInitWebhookUrl,
  readElevenLabsPhonePersonalizationWebhook,
} from "../lib/elevenlabs/phone-personalization";
import {
  firstMessageHasUnresolvedTemplates,
  readAgentFirstMessage,
} from "../lib/elevenlabs-placeholders";
import { getConvaiAgent } from "../lib/elevenlabs";
import { getElevenLabsAgentId, getElevenLabsConversationInitSecret } from "../lib/env.server";
import { getSiteOrigin } from "../lib/site-url";
import { syncRoalElevenLabsTools } from "../lib/sync-elevenlabs-roal-tools";
import { getServiceRoleSupabase } from "../lib/supabase/server";

function ensureEnvLocal(keys: Record<string, string>) {
  const path = resolve(process.cwd(), ".env.local");
  let text = existsSync(path) ? readFileSync(path, "utf8") : "";
  for (const [key, value] of Object.entries(keys)) {
    if (new RegExp(`^${key}=`, "m").test(text)) continue;
    text += `${text.endsWith("\n") || text.length === 0 ? "" : "\n"}${key}=${value}\n`;
  }
  writeFileSync(path, text);
}

void (async () => {
  const restaurantId = process.env.ROAL_SYNC_RESTAURANT_ID?.trim();
  const restaurantName = process.env.ROAL_SYNC_RESTAURANT_NAME?.trim() ?? "";
  if (!restaurantId) {
    throw new Error("Set ROAL_SYNC_RESTAURANT_ID");
  }

  const agentId =
    process.env.ELEVENLABS_AGENT_ID?.trim() ||
    getElevenLabsAgentId() ||
    "";
  if (!agentId) throw new Error("ELEVENLABS_AGENT_ID required");

  const origin = getSiteOrigin();
  if (!origin && !process.env.SKIP_APP_URL_CHECK) {
    throw new Error(
      "Set NEXT_PUBLIC_APP_URL (or VERCEL_URL) before configuring the Twilio webhook"
    );
  }

  let initSecret = getElevenLabsConversationInitSecret();
  if (!initSecret) {
    initSecret = randomBytes(24).toString("hex");
    ensureEnvLocal({ ELEVENLABS_CONVERSATION_INIT_SECRET: initSecret });
    console.log("Wrote ELEVENLABS_CONVERSATION_INIT_SECRET to .env.local");
  }
  if (origin && !process.env.NEXT_PUBLIC_APP_URL?.trim()) {
    ensureEnvLocal({ NEXT_PUBLIC_APP_URL: origin });
    console.log(`Wrote NEXT_PUBLIC_APP_URL=${origin} to .env.local`);
  }

  const tools = await syncRoalElevenLabsTools({
    agentId,
    restaurantId,
    restaurantName,
  });
  const profile = await applyRestaurantOrderAgentProfile({
    agentId,
    restaurantId,
    restaurantName,
  });

  const webhookUrl = buildConversationInitWebhookUrl(initSecret);
  let phoneWebhook: { ok: true; webhook_url: string } | null = null;
  if (webhookUrl) {
    phoneWebhook = await applyElevenLabsPhonePersonalizationWebhook({
      agentId,
      webhookUrl,
      initSecret,
    });
  }

  const sb = getServiceRoleSupabase();
  if (sb) {
    const summary = {
      tools: tools.tools,
      tool_ids_on_agent: tools.tool_ids_on_agent,
      restaurant_placeholders_updated:
        tools.restaurant_placeholders_updated ||
        profile.restaurant_placeholders_updated,
      first_message_updated: tools.first_message_updated,
      restaurant_tools_baked: tools.restaurant_tools_baked,
      knowledge_base_doc_attached: profile.knowledge_base_doc_attached,
      phone_personalization_webhook: phoneWebhook?.webhook_url ?? null,
    };
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
  }

  const agent = await getConvaiAgent(agentId);
  const firstMessage = readAgentFirstMessage(agent);
  const phone = await readElevenLabsPhonePersonalizationWebhook(agentId);

  console.log(
    JSON.stringify(
      {
        restaurant_id: restaurantId,
        restaurant_name: restaurantName,
        agent_id: agentId,
        first_message: firstMessage,
        first_message_ok: !firstMessageHasUnresolvedTemplates(firstMessage),
        phone_personalization: phone,
        tools,
        profile,
        phone_webhook_applied: phoneWebhook,
      },
      null,
      2
    )
  );
})().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
