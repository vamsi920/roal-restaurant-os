import { getElevenLabsAgentId } from "../lib/env.server";
import { getServiceRoleSupabase } from "../lib/supabase/server";

void (async () => {
  const sb = getServiceRoleSupabase();
  if (!sb) {
    console.error("SUPABASE_SERVICE_ROLE_KEY required");
    process.exit(1);
  }
  const { data: profiles, error } = await sb
    .from("restaurant_profiles")
    .select("restaurant_id, elevenlabs_agent_id, elevenlabs_last_sync_at")
    .order("elevenlabs_last_sync_at", { ascending: false, nullsFirst: false })
    .limit(20);
  if (error) throw new Error(error.message);
  const ids = (profiles ?? []).map((p) => p.restaurant_id);
  const { data: rests } = await sb
    .from("restaurants")
    .select("id, name")
    .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
  const nameById = new Map((rests ?? []).map((r) => [r.id, r.name]));
  console.log(
    JSON.stringify(
      {
        env_default_agent_id: getElevenLabsAgentId(),
        restaurants: (profiles ?? []).map((p) => ({
          restaurant_id: p.restaurant_id,
          name: nameById.get(p.restaurant_id) ?? null,
          elevenlabs_agent_id: p.elevenlabs_agent_id,
          last_sync_at: p.elevenlabs_last_sync_at,
        })),
      },
      null,
      2
    )
  );
})().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
