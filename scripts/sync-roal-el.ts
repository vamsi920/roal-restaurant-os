/**
 * One-off: load .env.local via dotenv-cli, then sync ROAL tools to ElevenLabs.
 *   npx dotenv-cli -e .env.local -- npx tsx scripts/sync-roal-el.ts
 */
import { syncRoalElevenLabsTools } from "../lib/sync-elevenlabs-roal-tools";

async function main() {
  const agentId = process.env.ELEVENLABS_AGENT_ID?.trim();
  const r = await syncRoalElevenLabsTools(
    agentId ? { agentId } : undefined
  );
  console.log(
    JSON.stringify(
      {
        ok: r.ok,
        agent_id: r.agent_id,
        tools: r.tools.map((t) => ({ name: t.name, op: t.op })),
        tool_ids_on_agent_count: r.tool_ids_on_agent.length,
        restaurant_placeholders_updated: r.restaurant_placeholders_updated,
        restaurant_tools_baked: r.restaurant_tools_baked,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
