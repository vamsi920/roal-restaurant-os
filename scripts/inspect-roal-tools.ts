/**
 * QA: dump ROAL ElevenLabs webhook tool config (secrets redacted).
 * Run: npx tsx --env-file=.env --env-file=.env.local scripts/inspect-roal-tools.ts
 */
import {
  elevenlabsFetch,
  getConvaiAgent,
  listAllConvaiTools,
} from "../lib/elevenlabs";
import { getPublicEnv } from "../lib/env.public";
import { getElevenLabsAgentId } from "../lib/env.server";
import { ROAL_RESTAURANT_ID_HEADER } from "../lib/sync-elevenlabs-roal-tools";

const NAMES = ["get_menu_items", "sync_draft_order", "finalize_order"] as const;

function refFromUrl(u: unknown): string | null {
  const m = String(u ?? "").match(/https:\/\/([a-z0-9]+)\.supabase\.co/i);
  return m?.[1] ?? null;
}

function redact(v: unknown): string {
  if (typeof v !== "string") return "[redacted]";
  if (v.length <= 8) return "[redacted]";
  return `${v.slice(0, 4)}…${v.slice(-4)}`;
}

function redactHeaders(h: unknown): Record<string, unknown> {
  if (!h || typeof h !== "object") return {};
  const o: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(h as Record<string, string>)) {
    const lk = k.toLowerCase();
    if (lk === "authorization" || lk === "apikey") {
      o[k] = {
        present: Boolean(v),
        len: typeof v === "string" ? v.length : 0,
        preview: typeof v === "string" ? redact(v) : undefined,
      };
    } else if (lk === ROAL_RESTAURANT_ID_HEADER.toLowerCase()) {
      o[k] = { value: v, baked: typeof v === "string" && v.length > 0 };
    } else {
      o[k] = v;
    }
  }
  return o;
}

function collectDynamicVars(
  obj: unknown,
  path = ""
): { path: string; var: string }[] {
  const hits: { path: string; var: string }[] = [];
  if (!obj || typeof obj !== "object") return hits;
  if (Array.isArray(obj)) {
    obj.forEach((x, i) =>
      hits.push(...collectDynamicVars(x, `${path}[${i}]`))
    );
    return hits;
  }
  const rec = obj as Record<string, unknown>;
  if (
    typeof rec.dynamic_variable === "string" &&
    rec.dynamic_variable.trim().length > 0
  ) {
    hits.push({ path, var: rec.dynamic_variable });
  }
  for (const [k, v] of Object.entries(rec)) {
    hits.push(...collectDynamicVars(v, path ? `${path}.${k}` : k));
  }
  return hits;
}

void (async () => {
  const pub = getPublicEnv();
  const expectedRef = refFromUrl(pub.NEXT_PUBLIC_SUPABASE_URL);
  const agentId = getElevenLabsAgentId();
  if (!agentId) throw new Error("ELEVENLABS_AGENT_ID required");

  const agent = (await getConvaiAgent(agentId)) as {
    conversation_config?: {
      agent?: { prompt?: { tool_ids?: string[] } };
    };
  };
  const toolIds = agent.conversation_config?.agent?.prompt?.tool_ids ?? [];
  const listed = await listAllConvaiTools();
  const byName: Record<string, string> = {};
  for (const t of listed) {
    const n = t.tool_config?.name;
    if (n && (NAMES as readonly string[]).includes(n)) byName[n] = t.id;
  }

  const out: Record<string, unknown> = {
    expectedRef,
    agentId,
    promptToolIdCount: toolIds.length,
  };

  for (const name of NAMES) {
    const id = byName[name];
    if (!id) {
      out[name] = { error: "missing tool" };
      continue;
    }
    const res = await elevenlabsFetch(
      `/v1/convai/tools/${encodeURIComponent(id)}`,
      { method: "GET" }
    );
    const data = (await res.json()) as { tool_config?: Record<string, unknown> };
    const cfg = (data.tool_config ?? data) as Record<string, unknown>;
    const schema = (cfg.api_schema ?? {}) as Record<string, unknown>;
    const url = String(schema.url ?? "");
    const urlRef = refFromUrl(url);
    const headers = redactHeaders(schema.request_headers);
    const dyn = collectDynamicVars(schema);
    const body =
      (schema.request_body_schema as { required?: string[]; properties?: Record<string, unknown> } | undefined) ??
      (schema.query_params_schema as { required?: string[]; properties?: Record<string, unknown> } | undefined);
    const required = body?.required ?? [];
    const props = body?.properties ? Object.keys(body.properties) : [];
    const ridHeader = headers[ROAL_RESTAURANT_ID_HEADER] as
      | { baked?: boolean; value?: string }
      | undefined;

    out[name] = {
      id,
      onAgent: toolIds.includes(id),
      method: schema.method,
      urlPath: url.replace(/https:\/\/[^/]+/, ""),
      urlHostRef: urlRef,
      refMatch: urlRef === expectedRef,
      urlHasRestaurantQuery: /restaurant_id=/.test(url),
      urlHasRestaurantNameQuery: /restaurant_name=/.test(url),
      headers,
      required,
      properties: props,
      dynamicVars: dyn,
      bakedRestaurantHeader: Boolean(ridHeader?.baked),
      hasApiKeyHeader: Boolean(
        (headers.apikey as { present?: boolean } | undefined)?.present
      ),
      hasAuthHeader: Boolean(
        (headers.Authorization as { present?: boolean } | undefined)?.present
      ),
      phoneSafe:
        dyn.filter((d) =>
          ["restaurant_id", "restaurant_name"].includes(d.var)
        ).length === 0 && Boolean(ridHeader?.baked),
    };
  }

  console.log(JSON.stringify(out, null, 2));
})().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
