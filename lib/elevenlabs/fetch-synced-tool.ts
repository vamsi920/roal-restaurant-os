import { elevenlabsFetch, listAllConvaiTools } from "@/lib/elevenlabs";
import { getElevenLabsAgentId } from "@/lib/env.server";

export const ROAL_SYNCED_TOOL_NAMES = [
  "get_menu_items",
  "sync_draft_order",
  "finalize_order",
] as const;

export type RoalSyncedToolName = (typeof ROAL_SYNCED_TOOL_NAMES)[number];

export type SyncedRoalToolConfig = {
  id: string;
  name: RoalSyncedToolName;
  url: string;
  method: string;
  headers: Record<string, string>;
  requestBodySchema: unknown;
  queryParamsSchema: unknown;
};

/** Load live ElevenLabs webhook tool config (same URL/headers ElevenLabs sends on calls). */
export async function fetchSyncedRoalTool(
  toolName: RoalSyncedToolName,
  agentId?: string | null
): Promise<SyncedRoalToolConfig> {
  const aid = agentId?.trim() || getElevenLabsAgentId();
  if (!aid) throw new Error("ELEVENLABS_AGENT_ID required");

  const listed = await listAllConvaiTools();
  const row = listed.find((t) => t.tool_config?.name === toolName);
  if (!row?.id) throw new Error(`Tool ${toolName} not found on ElevenLabs account`);

  const res = await elevenlabsFetch(
    `/v1/convai/tools/${encodeURIComponent(row.id)}`,
    { method: "GET" }
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch tool ${toolName}: HTTP ${res.status}`);
  }

  const data = (await res.json()) as { tool_config?: Record<string, unknown> };
  const cfg = (data.tool_config ?? data) as Record<string, unknown>;
  const schema = (cfg.api_schema ?? {}) as Record<string, unknown>;

  return {
    id: row.id,
    name: toolName,
    url: String(schema.url ?? ""),
    method: String(schema.method ?? "GET").toUpperCase(),
    headers: (schema.request_headers ?? {}) as Record<string, string>,
    requestBodySchema: schema.request_body_schema ?? null,
    queryParamsSchema: schema.query_params_schema ?? null,
  };
}

export type InvokeSyncedRoalToolResult = {
  status: number;
  json: unknown;
  /** x-roal-idempotent-replay response header when present */
  replay: string | null;
};

/** Invoke a synced ROAL webhook tool exactly as ElevenLabs would (URL + headers + optional JSON body). */
export async function invokeSyncedRoalTool(
  tool: Pick<SyncedRoalToolConfig, "url" | "method" | "headers">,
  body?: unknown,
  options?: { extraHeaders?: Record<string, string> }
): Promise<InvokeSyncedRoalToolResult> {
  const headers = { ...tool.headers, ...options?.extraHeaders };
  const init: RequestInit = {
    method: tool.method,
    headers,
    signal: AbortSignal.timeout(45000),
  };
  if (tool.method !== "GET" && body !== undefined) {
    init.headers = { ...headers, "Content-Type": "application/json" };
    init.body = JSON.stringify(body);
  }
  const res = await fetch(tool.url, init);
  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 500) };
  }
  return {
    status: res.status,
    json,
    replay: res.headers.get("x-roal-idempotent-replay"),
  };
}
