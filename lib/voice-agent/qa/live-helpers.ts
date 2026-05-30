import type { SupabaseClient } from "@supabase/supabase-js";
import { elevenlabsFetch, getConvaiAgent, listAllConvaiTools } from "@/lib/elevenlabs";
import { readAgentFirstMessage } from "@/lib/elevenlabs-placeholders";
import { loadMenuPromptSnapshot } from "@/lib/elevenlabs/load-menu-prompt-snapshot";
import { ensureRestaurantProfile } from "@/lib/restaurant-profile/helpers";
import {
  ROAL_RESTAURANT_ID_HEADER,
  type SyncRoalElevenLabsToolsResult,
} from "@/lib/sync-elevenlabs-roal-tools";
import { getServiceRoleSupabase } from "@/lib/supabase/server";

export const ROAL_QA_TOOL_NAMES = [
  "get_menu_items",
  "sync_draft_order",
  "finalize_order",
] as const;

export type QaCheck = { name: string; ok: boolean; detail?: string };

export type QaRestaurantContext = {
  restaurantId: string;
  restaurantName: string;
  organizationId: string;
  created: boolean;
};

export type MenuSizeHint = {
  categoryCount: number;
  itemCount: number;
  modifierCount: number | null;
};

export function redactSecrets(text: string): string {
  return text
    .replace(/secret=[^&\s"']+/gi, "secret=[redacted]")
    .replace(/\bsk-[a-zA-Z0-9]{16,}\b/g, "[redacted]")
    .replace(/\broal1\.[a-zA-Z0-9._-]+/gi, "[redacted]")
    .replace(/\bxi-[a-zA-Z0-9]{20,}\b/gi, "[redacted]");
}

export function printQaChecks(checks: QaCheck[]): number {
  let pass = 0;
  for (const c of checks) {
    const mark = c.ok ? "PASS" : "FAIL";
    if (c.ok) pass += 1;
    console.log(`[${mark}] ${c.name}${c.detail ? `: ${c.detail}` : ""}`);
  }
  console.log(`\n${pass}/${checks.length} checks passed`);
  return pass;
}

export function requireServiceRoleSupabase(): SupabaseClient {
  const sb = getServiceRoleSupabase();
  if (!sb) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY required for live QA scripts");
  }
  return sb;
}

export async function resolveQaRestaurant(
  supabase: SupabaseClient
): Promise<QaRestaurantContext> {
  const existingId = process.env.QA_RESTAURANT_ID?.trim();
  if (existingId) {
    const { data, error } = await supabase
      .from("restaurants")
      .select("id, name, organization_id")
      .eq("id", existingId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error(`QA_RESTAURANT_ID not found: ${existingId}`);
    await ensureRestaurantProfile(
      supabase,
      data.id,
      String(data.organization_id)
    );
    return {
      restaurantId: data.id,
      restaurantName: String(data.name ?? "Restaurant").trim() || "Restaurant",
      organizationId: String(data.organization_id),
      created: false,
    };
  }

  if (process.env.QA_CREATE_RESTAURANT === "1") {
    const orgId = process.env.QA_ORG_ID?.trim();
    if (!orgId) {
      throw new Error("QA_ORG_ID is required when QA_CREATE_RESTAURANT=1");
    }
    const runId = Date.now().toString(36);
    const name =
      process.env.QA_RESTAURANT_NAME?.trim() || `ROAL QA Voice ${runId}`;
    const { data, error } = await supabase
      .from("restaurants")
      .insert({ organization_id: orgId, name })
      .select("id, name, organization_id")
      .single();
    if (error) throw new Error(error.message);
    await ensureRestaurantProfile(
      supabase,
      data.id,
      String(data.organization_id)
    );
    console.log(
      `Created QA restaurant ${data.id} (${name}). Set QA_RESTAURANT_ID=${data.id} to reuse.`
    );
    return {
      restaurantId: data.id,
      restaurantName: String(data.name).trim(),
      organizationId: String(data.organization_id),
      created: true,
    };
  }

  throw new Error(
    "Set QA_RESTAURANT_ID to an existing restaurant, or QA_CREATE_RESTAURANT=1 with QA_ORG_ID"
  );
}

export function resolveQaUserId(): string {
  const id = process.env.QA_USER_ID?.trim();
  if (!id) {
    throw new Error(
      "QA_USER_ID is required for provision (audit log user id, e.g. owner fixture)"
    );
  }
  return id;
}

export function readAgentSystemPrompt(agentRoot: unknown): string | null {
  if (!agentRoot || typeof agentRoot !== "object") return null;
  const conv = (agentRoot as Record<string, unknown>).conversation_config;
  if (!conv || typeof conv !== "object") return null;
  const ag = (conv as Record<string, unknown>).agent;
  if (!ag || typeof ag !== "object") return null;
  const pr = (ag as Record<string, unknown>).prompt;
  if (!pr || typeof pr !== "object") return null;
  const text = (pr as Record<string, unknown>).prompt;
  return typeof text === "string" && text.trim() ? text : null;
}

export function extractMenuSizeHint(prompt: string | null): MenuSizeHint | null {
  if (!prompt) return null;
  const withModifiers = prompt.match(
    /Menu size hint:\s*(\d+)\s*categories,\s*(\d+)\s*items,\s*(\d+)\s*modifier options/i
  );
  if (withModifiers) {
    return {
      categoryCount: Number(withModifiers[1]),
      itemCount: Number(withModifiers[2]),
      modifierCount: Number(withModifiers[3]),
    };
  }
  const simple = prompt.match(
    /Menu size hint:\s*(\d+)\s*categories,\s*(\d+)\s*items/i
  );
  if (!simple) return null;
  return {
    categoryCount: Number(simple[1]),
    itemCount: Number(simple[2]),
    modifierCount: null,
  };
}

export async function fetchRoalToolConfig(toolName: string) {
  const listed = await listAllConvaiTools();
  const row = listed.find((t) => t.tool_config?.name === toolName);
  if (!row?.id) throw new Error(`ElevenLabs tool not found: ${toolName}`);

  const res = await elevenlabsFetch(
    `/v1/convai/tools/${encodeURIComponent(row.id)}`,
    { method: "GET" }
  );
  const data = (await res.json()) as { tool_config?: Record<string, unknown> };
  const cfg = (data.tool_config ?? data) as Record<string, unknown>;
  const schema = (cfg.api_schema ?? {}) as Record<string, unknown>;
  return {
    id: row.id,
    name: toolName,
    url: String(schema.url ?? ""),
    headers: (schema.request_headers ?? {}) as Record<string, string>,
  };
}

export function toolUrlBakedForRestaurant(
  url: string,
  restaurantId: string
): boolean {
  return (
    url.includes(`restaurant_id=${encodeURIComponent(restaurantId)}`) ||
    url.includes(restaurantId)
  );
}

export async function verifyBakedToolsForRestaurant(input: {
  agentId: string;
  restaurantId: string;
}): Promise<QaCheck[]> {
  const checks: QaCheck[] = [];
  const agent = await getConvaiAgent(input.agentId);
  const toolIdsRaw =
    agent &&
    typeof agent === "object" &&
    Array.isArray(
      (
        agent as {
          conversation_config?: { agent?: { prompt?: { tool_ids?: unknown } } };
        }
      ).conversation_config?.agent?.prompt?.tool_ids
    )
      ? ((
          agent as {
            conversation_config: { agent: { prompt: { tool_ids: string[] } } };
          }
        ).conversation_config.agent.prompt.tool_ids as string[])
      : [];

  for (const name of ROAL_QA_TOOL_NAMES) {
    const tool = await fetchRoalToolConfig(name);
    const bakedUrl = toolUrlBakedForRestaurant(tool.url, input.restaurantId);
    const headerOk =
      tool.headers[ROAL_RESTAURANT_ID_HEADER] === input.restaurantId;
    checks.push({
      name: `tool ${name}: baked restaurant_id in URL`,
      ok: bakedUrl,
      detail: bakedUrl ? "url ok" : redactSecrets(tool.url).slice(0, 120),
    });
    if (name !== "get_menu_items") {
      checks.push({
        name: `tool ${name}: ${ROAL_RESTAURANT_ID_HEADER} header`,
        ok: headerOk,
      });
    }
    checks.push({
      name: `tool ${name}: attached to agent`,
      ok: toolIdsRaw.includes(tool.id),
      detail: tool.id,
    });
  }

  return checks;
}

export async function loadProfileVoiceState(
  supabase: SupabaseClient,
  restaurantId: string
) {
  const { data, error } = await supabase
    .from("restaurant_profiles")
    .select(
      "elevenlabs_agent_id,elevenlabs_provision_status,elevenlabs_provision_error,elevenlabs_provisioned_at,elevenlabs_menu_auto_sync_status,elevenlabs_menu_auto_sync_error,elevenlabs_last_sync_at,elevenlabs_last_sync_summary"
    )
    .eq("restaurant_id", restaurantId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export function checksFromSyncSummary(
  summary: SyncRoalElevenLabsToolsResult | Record<string, unknown> | null,
  label: string
): QaCheck[] {
  const s = summary as {
    restaurant_tools_baked?: boolean;
    tools?: { name: string }[];
    tool_ids_on_agent?: string[];
  } | null;
  return [
    {
      name: `${label}: restaurant_tools_baked`,
      ok: s?.restaurant_tools_baked === true,
    },
    {
      name: `${label}: three tools in summary`,
      ok: (s?.tools?.length ?? 0) >= 3,
      detail: s?.tools?.map((t) => t.name).join(", "),
    },
    {
      name: `${label}: tool_ids on agent`,
      ok: (s?.tool_ids_on_agent?.length ?? 0) >= 3,
      detail: String(s?.tool_ids_on_agent?.length ?? 0),
    },
  ];
}

export async function readAgentMenuSnapshot(agentId: string) {
  const agent = await getConvaiAgent(agentId);
  const prompt = readAgentSystemPrompt(agent);
  const hint = extractMenuSizeHint(prompt);
  const firstMessage = readAgentFirstMessage(agent);
  return { agent, prompt, hint, firstMessage };
}

export async function expectedMenuSnapshotFromDb(
  supabase: SupabaseClient,
  restaurantId: string
) {
  return loadMenuPromptSnapshot(supabase, restaurantId);
}

export function menuSnapshotsMatch(
  hint: MenuSizeHint | null,
  snapshot: { categoryCount: number; itemCount: number; modifierCount: number } | null
): boolean {
  if (!hint || !snapshot) return false;
  if (hint.categoryCount !== snapshot.categoryCount) return false;
  if (hint.itemCount !== snapshot.itemCount) return false;
  if (hint.modifierCount != null && hint.modifierCount !== snapshot.modifierCount) {
    return false;
  }
  return true;
}
