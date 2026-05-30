import { getConvaiAgent, patchConvaiAgent } from "@/lib/elevenlabs";
import { ELEVENLABS_CONVERSATION_INIT_SECRET_HEADER } from "@/lib/elevenlabs/conversation-init";
import { absoluteUrl } from "@/lib/site-url";

export function buildConversationInitWebhookUrl(secret?: string): string | undefined {
  const base = absoluteUrl("/api/integrations/elevenlabs/conversation-init");
  if (!base) return undefined;
  const s = secret?.trim();
  if (!s) return base;
  const u = new URL(base);
  u.searchParams.set("secret", s);
  return u.toString();
}

/** Enable Twilio personalization webhook on the Conv AI agent. */
export async function applyElevenLabsPhonePersonalizationWebhook(options: {
  agentId: string;
  webhookUrl: string;
  /** When set, also sent as `x-roal-conversation-init-secret` (URL may already include `?secret=`). */
  initSecret?: string;
}): Promise<{ ok: true; webhook_url: string }> {
  const url = options.webhookUrl.trim();
  if (!url) throw new Error("webhookUrl is required");

  const secret = options.initSecret?.trim();
  const request_headers: Record<string, string> = secret
    ? { [ELEVENLABS_CONVERSATION_INIT_SECRET_HEADER]: secret }
    : {};

  await patchConvaiAgent(options.agentId, {
    platform_settings: {
      overrides: {
        enable_conversation_initiation_client_data_from_webhook: true,
      },
      workspace_overrides: {
        conversation_initiation_client_data_webhook: {
          url,
          request_headers,
        },
      },
    },
  });

  return { ok: true, webhook_url: url };
}

export async function readElevenLabsPhonePersonalizationWebhook(
  agentId: string
): Promise<{ enabled: boolean; url: string | null }> {
  const raw = await getConvaiAgent(agentId);
  if (!raw || typeof raw !== "object") {
    return { enabled: false, url: null };
  }
  const ps = (raw as Record<string, unknown>).platform_settings;
  if (!ps || typeof ps !== "object") {
    return { enabled: false, url: null };
  }
  const overrides = (ps as Record<string, unknown>).overrides;
  const enabled = Boolean(
    overrides &&
      typeof overrides === "object" &&
      (overrides as Record<string, unknown>)
        .enable_conversation_initiation_client_data_from_webhook === true
  );

  const wo = (ps as Record<string, unknown>).workspace_overrides;
  let hookUrl: string | null = null;
  if (wo && typeof wo === "object") {
    const hook = (wo as Record<string, unknown>)
      .conversation_initiation_client_data_webhook;
    if (hook && typeof hook === "object") {
      const u = (hook as Record<string, unknown>).url;
      hookUrl = typeof u === "string" && u.trim() ? u.trim() : null;
    }
  }
  return { enabled, url: hookUrl };
}
