import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceRoleSupabase } from "@/lib/supabase/server";
import {
  defaultProvisionRestaurantVoiceAgentDeps,
  provisionRestaurantVoiceAgent,
  type ProvisionRestaurantVoiceAgentResult,
} from "@/lib/voice-agent/provision-restaurant-voice-agent";

/** Script / cron identity for audit_logs.user_id on backfill runs. */
export const VOICE_AGENT_BACKFILL_ACTOR_USER_ID =
  "00000000-0000-4000-8000-0000000000bf";

export type BackfillVoiceAgentArgv = {
  dryRun: boolean;
  force: boolean;
  limit: number | null;
};

export type BackfillVoiceAgentCandidate = {
  restaurantId: string;
  restaurantName: string;
  organizationId: string;
  existingAgentId: string | null;
};

export type BackfillVoiceAgentRowResult = {
  restaurantId: string;
  restaurantName: string;
  dryRun: boolean;
  skipped: boolean;
  ok: boolean;
  agentId: string | null;
  error: string | null;
};

export function parseBackfillVoiceAgentArgv(argv: string[]): BackfillVoiceAgentArgv {
  const dryRun = argv.includes("--dry-run");
  const force = argv.includes("--force");
  const limitIdx = argv.indexOf("--limit");
  let limit: number | null = null;
  if (limitIdx >= 0) {
    const raw = argv[limitIdx + 1];
    const n = raw ? Number.parseInt(raw, 10) : Number.NaN;
    if (!Number.isFinite(n) || n < 1) {
      throw new Error("--limit requires a positive integer");
    }
    limit = n;
  }
  return { dryRun, force, limit };
}

export async function loadVoiceAgentBackfillCandidates(
  supabase: SupabaseClient,
  options: { force: boolean; limit: number | null }
): Promise<BackfillVoiceAgentCandidate[]> {
  let query = supabase
    .from("restaurant_profiles")
    .select("restaurant_id, organization_id, elevenlabs_agent_id")
    .order("updated_at", { ascending: true });

  if (!options.force) {
    query = query.or('elevenlabs_agent_id.is.null,elevenlabs_agent_id.eq.""');
  }

  const { data: profiles, error } = await query;
  if (error) throw new Error(error.message);

  let rows = (profiles ?? []).filter((p) => {
    if (options.force) return true;
    const agentId =
      typeof p.elevenlabs_agent_id === "string"
        ? p.elevenlabs_agent_id.trim()
        : "";
    return agentId.length === 0;
  });

  if (options.limit != null) {
    rows = rows.slice(0, options.limit);
  }

  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.restaurant_id as string);
  const { data: restaurants, error: restErr } = await supabase
    .from("restaurants")
    .select("id, name")
    .in("id", ids);

  if (restErr) throw new Error(restErr.message);

  const nameById = new Map(
    (restaurants ?? []).map((r) => [r.id as string, (r.name as string) ?? ""])
  );

  return rows.map((p) => ({
    restaurantId: p.restaurant_id as string,
    organizationId: p.organization_id as string,
    restaurantName: nameById.get(p.restaurant_id as string) ?? "Restaurant",
    existingAgentId:
      typeof p.elevenlabs_agent_id === "string" &&
      p.elevenlabs_agent_id.trim()
        ? p.elevenlabs_agent_id.trim()
        : null,
  }));
}

export async function runVoiceAgentBackfill(
  options: BackfillVoiceAgentArgv & {
    supabase?: SupabaseClient;
    provision?: typeof provisionRestaurantVoiceAgent;
    actorUserId?: string;
  }
): Promise<{
  candidates: BackfillVoiceAgentCandidate[];
  results: BackfillVoiceAgentRowResult[];
}> {
  const supabase = options.supabase ?? getServiceRoleSupabase();
  if (!supabase) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY required for voice agent backfill");
  }

  const candidates = await loadVoiceAgentBackfillCandidates(supabase, {
    force: options.force,
    limit: options.limit,
  });

  const actorUserId = options.actorUserId ?? VOICE_AGENT_BACKFILL_ACTOR_USER_ID;
  const provisionFn = options.provision ?? provisionRestaurantVoiceAgent;

  const getSupabase = async () => supabase;
  const results: BackfillVoiceAgentRowResult[] = [];

  for (const row of candidates) {
    if (options.dryRun) {
      results.push({
        restaurantId: row.restaurantId,
        restaurantName: row.restaurantName,
        dryRun: true,
        skipped: false,
        ok: true,
        agentId: row.existingAgentId,
        error: null,
      });
      continue;
    }

    const outcome: ProvisionRestaurantVoiceAgentResult = await provisionFn(
      row.restaurantId,
      row.restaurantName,
      row.organizationId,
      actorUserId,
      {
        ...defaultProvisionRestaurantVoiceAgentDeps(),
        getSupabase,
      }
    );

    results.push({
      restaurantId: row.restaurantId,
      restaurantName: row.restaurantName,
      dryRun: false,
      skipped: false,
      ok: outcome.ok,
      agentId: outcome.ok ? outcome.agentId : outcome.agentId,
      error: outcome.ok ? null : outcome.error,
    });
  }

  return { candidates, results };
}
