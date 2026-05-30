import { getPublicEnv } from "@/lib/env.public";
import { ENV_HINTS } from "@/lib/env.shared";
import { getSiteOrigin } from "@/lib/site-url";
import { collectMissingForFeature } from "@/lib/env.server";
import {
  firstMessageHasUnresolvedTemplates,
  readAgentDynamicPlaceholders,
  readAgentFirstMessage,
} from "@/lib/elevenlabs-placeholders";
import { sanitizeVoiceAgentDisplayError } from "@/lib/voice-agent/sanitize-display-error";
import type {
  EnvSecretRow,
  MenuAutoSyncSnapshot,
  ProfileVariableRow,
  ToolUrlRow,
  VoiceAgentControlCenterSnapshot,
  VoiceAgentConnectionStatus,
} from "@/lib/voice-agent/control-center-types";

const ROAL_TOOL_NAMES = [
  "get_menu_items",
  "sync_draft_order",
  "finalize_order",
] as const;

export function buildVoiceAgentToolUrls(input: {
  edgeBase: string;
  restaurantId: string;
  restaurantName: string;
}): ToolUrlRow[] {
  const base = input.edgeBase.replace(/\/+$/, "");
  const rid = encodeURIComponent(input.restaurantId);
  const rname = encodeURIComponent(input.restaurantName);
  return [
    {
      name: "get_menu_items",
      label: "get_menu_items",
      url: `${base}/functions/v1/get-menu?restaurant_id=${rid}&restaurant_name=${rname}`,
      headerNote: "Baked: restaurant in URL + x-roal-restaurant-id when synced from KDS",
    },
    {
      name: "sync_draft_order",
      label: "sync_draft_order",
      url: `${base}/functions/v1/sync-draft-order`,
      headerNote:
        "POST · Authorization: Bearer roal1.* (signed) or AGENT_TOOL_SECRET · apikey: anon",
    },
    {
      name: "finalize_order",
      label: "finalize_order",
      url: `${base}/functions/v1/finalize-order`,
      headerNote: "POST · same auth headers as sync_draft_order",
    },
  ];
}

export function buildEnvSecretRows(): EnvSecretRow[] {
  const voiceMissing = collectMissingForFeature("voice-sync");
  const missingMap = new Map(voiceMissing.map((m) => [m.path, m]));
  const agentToolAuthOk = !voiceMissing.some(
    (m) => m.path === "AGENT_TOOL_SIGNING_SECRET"
  );
  const pub = getPublicEnv();

  const rows: { key: string; required: boolean; ok: boolean }[] = [
    {
      key: "NEXT_PUBLIC_SUPABASE_URL",
      required: true,
      ok: Boolean(pub.NEXT_PUBLIC_SUPABASE_URL?.trim()),
    },
    {
      key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      required: true,
      ok: Boolean(pub.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()),
    },
    {
      key: "ELEVENLABS_API_KEY",
      required: true,
      ok: !missingMap.has("ELEVENLABS_API_KEY"),
    },
    {
      key: "AGENT_TOOL_SIGNING_SECRET",
      required: false,
      ok: agentToolAuthOk,
    },
    {
      key: "AGENT_TOOL_SECRET",
      required: false,
      ok: agentToolAuthOk,
    },
    {
      key: "ELEVENLABS_AGENT_ID",
      required: false,
      ok: !missingMap.has("ELEVENLABS_AGENT_ID"),
    },
    {
      key: "RESTAURANT_AGENT_TIMEZONE",
      required: false,
      ok: true,
    },
  ];

  return rows.map(({ key, required, ok }) => {
    const issue = missingMap.get(key);
    return {
      key,
      ok,
      required,
      message: ok ? "Set" : issue?.message ?? "Missing",
      hint: ENV_HINTS[key] ?? issue?.hint ?? null,
    };
  });
}

function readToolIdsFromAgent(agentRoot: unknown): string[] {
  if (!agentRoot || typeof agentRoot !== "object") return [];
  const conv = (agentRoot as Record<string, unknown>).conversation_config;
  if (!conv || typeof conv !== "object") return [];
  const ag = (conv as Record<string, unknown>).agent;
  if (!ag || typeof ag !== "object") return [];
  const pr = (ag as Record<string, unknown>).prompt;
  if (!pr || typeof pr !== "object") return [];
  const ids = (pr as Record<string, unknown>).tool_ids;
  if (!Array.isArray(ids)) return [];
  return ids.filter((x): x is string => typeof x === "string");
}

function readAgentName(agentRoot: unknown): string | null {
  if (!agentRoot || typeof agentRoot !== "object") return null;
  const name = (agentRoot as Record<string, unknown>).name;
  return typeof name === "string" && name.trim() ? name.trim() : null;
}

export function buildExpectedPlaceholders(
  restaurantId: string,
  restaurantName: string,
  agentRoot: unknown | null
): ProfileVariableRow[] {
  const actual = agentRoot ? readAgentDynamicPlaceholders(agentRoot) : {};
  const keys = ["restaurant_id", "restaurant_name"] as const;
  return keys.map((key) => {
    const expected =
      key === "restaurant_id" ? restaurantId : restaurantName.trim() || "the restaurant";
    const raw = actual[key] ?? null;
    return {
      key,
      expected,
      actual: raw,
      matches: raw === expected,
    };
  });
}

function buildChecklist(
  snapshot: Omit<
    VoiceAgentControlCenterSnapshot,
    "checklist"
  >,
  agentRoot: unknown | null
): VoiceAgentControlCenterSnapshot["checklist"] {
  const items: VoiceAgentControlCenterSnapshot["checklist"] = [];

  const envOk = snapshot.envSecrets
    .filter((r) => r.required)
    .every((r) => r.ok);
  const agentAuthOk = snapshot.envSecrets
    .filter((r) => r.key.startsWith("AGENT_TOOL_"))
    .every((r) => r.ok);
  items.push({
    id: "env",
    label: "Server secrets configured (.env)",
    status: envOk && agentAuthOk ? "ok" : "error",
    detail:
      envOk && agentAuthOk
        ? undefined
        : "Fix missing keys below before connecting the agent.",
  });

  const hasAgent = Boolean(snapshot.agentId);
  items.push({
    id: "agent_id",
    label: "ElevenLabs agent linked",
    status: hasAgent ? "ok" : "pending",
    detail: hasAgent
      ? snapshot.agentIdSource === "env_default"
        ? "Using ELEVENLABS_AGENT_ID from .env (not saved to profile yet)."
        : undefined
      : "Enter agent id and run Connect / Sync.",
  });

  if (snapshot.connectionStatus === "unreachable") {
    items.push({
      id: "agent_api",
      label: "ElevenLabs API reachable",
      status: "error",
      detail: snapshot.agentFetchError ?? "Could not fetch agent.",
    });
  } else if (hasAgent) {
    items.push({
      id: "agent_api",
      label: "ElevenLabs API reachable",
      status: "ok",
    });
  }

  const toolsOk =
    snapshot.lastSyncTools.length >= 3 &&
    ROAL_TOOL_NAMES.every((n) =>
      snapshot.lastSyncTools.some((t) => t.name === n)
    );
  items.push({
    id: "tools_synced",
    label: "ROAL webhook tools synced",
    status: snapshot.lastSyncAt
      ? toolsOk
        ? "ok"
        : "warn"
      : "pending",
    detail: snapshot.lastSyncAt
      ? toolsOk
        ? `Last sync ${formatRelative(snapshot.lastSyncAt)}`
        : "Re-sync — expected get_menu_items, sync_draft_order, finalize_order"
      : "Not synced yet",
  });

  const placeholdersOk = snapshot.expectedPlaceholders.every((p) => p.matches);
  const firstMessage = readAgentFirstMessage(agentRoot);
  const firstMessageTemplates = firstMessageHasUnresolvedTemplates(firstMessage);
  items.push({
    id: "first_message",
    label: "Agent first message uses literal restaurant name",
    status: !hasAgent
      ? "pending"
      : firstMessageTemplates
        ? "error"
        : "ok",
    detail: firstMessageTemplates
      ? "Re-run Connect / Sync — first_message still contains {{…}} templates (Twilio calls fail)."
      : undefined,
  });

  items.push({
    id: "placeholders",
    label: "Agent placeholders match this restaurant",
    status: !hasAgent
      ? "pending"
      : placeholdersOk
        ? "ok"
        : snapshot.lastSyncPlaceholdersUpdated
          ? "warn"
          : "error",
    detail: placeholdersOk
      ? undefined
      : "Run Connect / Sync to PATCH restaurant_id and restaurant_name on the agent.",
  });

  const toolIdsOk = snapshot.toolIdsOnAgent.length >= 3;
  items.push({
    id: "tool_ids",
    label: "Tool IDs attached on agent prompt",
    status: !hasAgent
      ? "pending"
      : toolIdsOk
        ? "ok"
        : "warn",
    detail: toolIdsOk
      ? `${snapshot.toolIdsOnAgent.length} tools on agent`
      : "Agent prompt may be missing ROAL tool_ids — re-sync",
  });

  const appUrl = getSiteOrigin();
  const initPath = "/api/integrations/elevenlabs/conversation-init";
  if (hasAgent) {
    const syncedWebhook = snapshot.lastSyncPhoneWebhook?.includes(initPath);
    items.push({
      id: "twilio_personalization",
      label: "Phone: Twilio personalization webhook in ElevenLabs",
      status: !appUrl
        ? "warn"
        : syncedWebhook
          ? "ok"
          : "warn",
      detail: !appUrl
        ? "Set NEXT_PUBLIC_APP_URL (or VERCEL_URL), then Connect / Sync."
        : syncedWebhook
          ? "PATCHed on last Connect — confirm ElevenLabs Phone → Personalization matches."
          : `Set Personalization URL to ${appUrl}${initPath} (required for inbound calls).`,
    });
  }

  if (snapshot.supabaseRef) {
    items.push({
      id: "supabase_ref",
      label: "Supabase project URL valid",
      status: "ok",
      detail: snapshot.supabaseRef,
    });
  } else {
    items.push({
      id: "supabase_ref",
      label: "Supabase project URL valid",
      status: "error",
      detail: "Set NEXT_PUBLIC_SUPABASE_URL",
    });
  }

  return items;
}

function formatRelative(iso: string): string {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d);
  } catch {
    return iso;
  }
}

export function assembleControlCenterSnapshot(input: {
  restaurantId: string;
  restaurantName: string;
  edgeBase: string;
  supabaseRef: string | null;
  profileAgentId: string | null;
  envDefaultAgentId: string | null;
  lastSyncAt: string | null;
  lastSyncError: string | null;
  lastSyncSummary: {
    tools?: { name: string; id: string; op: "created" | "updated" }[];
    restaurant_placeholders_updated?: boolean;
    restaurant_tools_baked?: boolean;
    knowledge_base_doc_attached?: boolean;
    phone_personalization_webhook?: string | null;
  } | null;
  menuAutoSync: MenuAutoSyncSnapshot;
  agentRoot: unknown | null;
  agentFetchError: string | null;
}): VoiceAgentControlCenterSnapshot {
  const agentId =
    input.profileAgentId?.trim() ||
    input.envDefaultAgentId?.trim() ||
    null;
  const agentIdSource = input.profileAgentId?.trim()
    ? "profile"
    : input.envDefaultAgentId?.trim()
      ? "env_default"
      : null;

  const envSecrets = buildEnvSecretRows();
  const agentToolAuthOk = envSecrets
    .filter((r) => r.key.startsWith("AGENT_TOOL_"))
    .every((r) => r.ok);
  const envReady =
    envSecrets.filter((r) => r.required).every((r) => r.ok) && agentToolAuthOk;

  let connectionStatus: VoiceAgentConnectionStatus = "disconnected";
  if (!agentId) {
    connectionStatus = "disconnected";
  } else if (input.agentFetchError) {
    connectionStatus = "unreachable";
  } else if (input.agentRoot) {
    const placeholders = buildExpectedPlaceholders(
      input.restaurantId,
      input.restaurantName,
      input.agentRoot
    );
    connectionStatus = placeholders.every((p) => p.matches)
      ? "connected"
      : "misconfigured";
  }

  const partial: Omit<VoiceAgentControlCenterSnapshot, "checklist"> = {
    restaurantId: input.restaurantId,
    restaurantName: input.restaurantName,
    edgeBase: input.edgeBase.replace(/\/+$/, ""),
    supabaseRef: input.supabaseRef,
    envSecrets,
    envReady,
    connectionStatus,
    agentId,
    agentIdSource,
    agentDisplayName: input.agentRoot ? readAgentName(input.agentRoot) : null,
    toolIdsOnAgent: input.agentRoot ? readToolIdsFromAgent(input.agentRoot) : [],
    expectedPlaceholders: buildExpectedPlaceholders(
      input.restaurantId,
      input.restaurantName,
      input.agentRoot
    ),
    toolUrls: buildVoiceAgentToolUrls({
      edgeBase: input.edgeBase,
      restaurantId: input.restaurantId,
      restaurantName: input.restaurantName,
    }),
    lastSyncAt: input.lastSyncAt,
    lastSyncError: sanitizeVoiceAgentDisplayError(input.lastSyncError),
    lastSyncTools: input.lastSyncSummary?.tools ?? [],
    lastSyncPlaceholdersUpdated:
      input.lastSyncSummary?.restaurant_placeholders_updated ?? false,
    lastSyncToolsBaked: input.lastSyncSummary?.restaurant_tools_baked ?? false,
    lastSyncKbAttached:
      input.lastSyncSummary?.knowledge_base_doc_attached ?? false,
    lastSyncPhoneWebhook:
      input.lastSyncSummary?.phone_personalization_webhook?.trim() || null,
    agentFetchError: sanitizeVoiceAgentDisplayError(input.agentFetchError),
    menuAutoSync: input.menuAutoSync,
  };

  return {
    ...partial,
    checklist: buildChecklist(partial, input.agentRoot),
  };
}
