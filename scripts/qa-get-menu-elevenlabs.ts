/**
 * Prompt 18 — verify get_menu_items using synced ElevenLabs tool URL + headers.
 * Usage: npx tsx --env-file=.env --env-file=.env.local scripts/qa-get-menu-elevenlabs.ts
 */
import {
  fetchSyncedRoalTool,
  invokeSyncedRoalTool,
} from "../lib/elevenlabs/fetch-synced-tool";
import { getElevenLabsAgentId } from "../lib/env.server";
import { ROAL_RESTAURANT_ID_HEADER } from "../lib/sync-elevenlabs-roal-tools";
import { getServiceRoleSupabase } from "../lib/supabase/server";

const RESTAURANT_ID =
  process.env.QA_RESTAURANT_ID?.trim() || "9d3263d1-4d9d-4f89-bfc5-160e2cca1855";

type MenuCategory = { items?: unknown[] };
type MenuResponse = {
  restaurant?: { id?: string; name?: string };
  categories?: MenuCategory[];
  operations?: { ordering_allowed?: boolean; message?: string };
  error?: string;
  code?: string;
};

function countItems(categories: MenuCategory[]): number {
  return categories.reduce(
    (n, c) => n + (Array.isArray(c.items) ? c.items.length : 0),
    0
  );
}

function urlPath(url: string): string {
  try {
    const u = new URL(url);
    return `${u.pathname}${u.search.replace(/secret=[^&]+/, "secret=[redacted]")}`;
  } catch {
    return url.replace(/https:\/\/[^/]+/, "");
  }
}

void (async () => {
  const sb = getServiceRoleSupabase();
  if (!sb) throw new Error("SUPABASE_SERVICE_ROLE_KEY required");

  const { data: profile } = await sb
    .from("restaurant_profiles")
    .select("elevenlabs_agent_id, elevenlabs_last_sync_summary")
    .eq("restaurant_id", RESTAURANT_ID)
    .maybeSingle();

  const agentId =
    profile?.elevenlabs_agent_id?.trim() || getElevenLabsAgentId() || "";
  if (!agentId) throw new Error("No ElevenLabs agent id for active restaurant");

  const { data: restaurant } = await sb
    .from("restaurants")
    .select("name")
    .eq("id", RESTAURANT_ID)
    .maybeSingle();

  const tool = await fetchSyncedRoalTool("get_menu_items", agentId);
  const ridHeader = tool.headers[ROAL_RESTAURANT_ID_HEADER];
  const bakedInUrl = tool.url.includes(
    `restaurant_id=${encodeURIComponent(RESTAURANT_ID)}`
  );

  console.log(
    JSON.stringify(
      {
        restaurant_id: RESTAURANT_ID,
        restaurant_name: restaurant?.name ?? null,
        agent_id: agentId,
        tool_id: tool.id,
        method: tool.method,
        url_path: urlPath(tool.url),
        headers_present: {
          apikey: Boolean(tool.headers.apikey),
          Authorization: Boolean(tool.headers.Authorization),
          [ROAL_RESTAURANT_ID_HEADER]: ridHeader === RESTAURANT_ID,
        },
        baked_in_url: bakedInUrl,
        last_sync_baked: Boolean(
          (profile?.elevenlabs_last_sync_summary as { restaurant_tools_baked?: boolean } | null)
            ?.restaurant_tools_baked
        ),
      },
      null,
      2
    )
  );

  const { status, json } = await invokeSyncedRoalTool(tool);
  const menu = json as MenuResponse;
  const categories = Array.isArray(menu.categories) ? menu.categories : [];
  const itemCount = countItems(categories);

  const checks: { name: string; ok: boolean; detail?: string }[] = [
    {
      name: "HTTP 200",
      ok: status === 200,
      detail: `HTTP ${status}`,
    },
    {
      name: "non-empty categories",
      ok: categories.length >= 1,
      detail: String(categories.length),
    },
    {
      name: "non-empty items",
      ok: itemCount >= 1,
      detail: String(itemCount),
    },
    {
      name: "restaurant block present",
      ok: Boolean(menu.restaurant?.name?.trim()),
      detail: menu.restaurant?.name ?? menu.error ?? "missing",
    },
    {
      name: "operations block present",
      ok: menu.operations != null && typeof menu.operations.ordering_allowed === "boolean",
    },
    {
      name: "tool baked to QA restaurant",
      ok: bakedInUrl && ridHeader === RESTAURANT_ID,
    },
  ];

  let pass = 0;
  for (const c of checks) {
    if (c.ok) pass += 1;
    console.log(`[${c.ok ? "PASS" : "FAIL"}] ${c.name}${c.detail ? `: ${c.detail}` : ""}`);
  }

  if (status !== 200 && menu.error) {
    console.log(`error payload: ${menu.error}${menu.code ? ` (${menu.code})` : ""}`);
  }

  console.log(`\n${pass}/${checks.length} checks passed`);
  if (pass !== checks.length) process.exit(1);
})().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
