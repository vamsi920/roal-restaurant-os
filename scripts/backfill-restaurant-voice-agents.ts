/**
 * Backfill dedicated ElevenLabs ConvAI agents for restaurants missing elevenlabs_agent_id.
 *
 * Usage:
 *   npx tsx --env-file=.env --env-file=.env.local scripts/backfill-restaurant-voice-agents.ts
 *   npx tsx --env-file=.env --env-file=.env.local scripts/backfill-restaurant-voice-agents.ts --dry-run
 *   npx tsx --env-file=.env --env-file=.env.local scripts/backfill-restaurant-voice-agents.ts --limit 5
 *   npx tsx --env-file=.env --env-file=.env.local scripts/backfill-restaurant-voice-agents.ts --force --limit 1
 *
 * Requires: ELEVENLABS_API_KEY, ELEVENLABS_AGENT_ID (template), SUPABASE_SERVICE_ROLE_KEY,
 * ROAL tool secrets used by provisionRestaurantVoiceAgent / runRestaurantVoiceAgentSync.
 */
import {
  parseBackfillVoiceAgentArgv,
  runVoiceAgentBackfill,
} from "../lib/voice-agent/backfill-voice-agents";

void (async () => {
  const argv = parseBackfillVoiceAgentArgv(process.argv);

  console.log(
    JSON.stringify(
      {
        mode: argv.dryRun ? "dry-run" : "provision",
        force: argv.force,
        limit: argv.limit,
      },
      null,
      2
    )
  );

  const { candidates, results } = await runVoiceAgentBackfill(argv);

  const summary = {
    candidates: candidates.length,
    dry_run: argv.dryRun,
    force: argv.force,
    succeeded: results.filter((r) => r.ok && !r.skipped).length,
    failed: results.filter((r) => !r.ok && !r.skipped).length,
    skipped: results.filter((r) => r.skipped).length,
    rows: results.map((r) => ({
      restaurant_id: r.restaurantId,
      name: r.restaurantName,
      ok: r.ok,
      skipped: r.skipped,
      agent_id: r.agentId,
      error: r.error,
    })),
  };

  console.log(JSON.stringify(summary, null, 2));

  if (!argv.dryRun && summary.failed > 0) {
    process.exitCode = 1;
  }
})().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
