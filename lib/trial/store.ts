import type { Db } from "@/lib/db";
import { getDb } from "@/lib/db";
import type {
  TrialPublicView,
  TrialRecord,
  TrialStepId,
  TrialStepLogEntry,
  TrialStepStatus,
} from "@/lib/trial/types";
import { resolveTrialPersona } from "@/lib/trial/voices";

export class TrialStoreUnavailableError extends Error {
  constructor() {
    super("Try-a-call is not configured on this server (service role key missing).");
    this.name = "TrialStoreUnavailableError";
  }
}

export function requireTrialDb(): Db {
  const db = getDb();
  if (!db) throw new TrialStoreUnavailableError();
  return db;
}

function asRecord(row: Record<string, unknown>): TrialRecord {
  return {
    id: String(row.id),
    status: row.status as TrialRecord["status"],
    source_kind: row.source_kind as TrialRecord["source_kind"],
    source_input: String(row.source_input ?? ""),
    step_log: Array.isArray(row.step_log) ? (row.step_log as TrialStepLogEntry[]) : [],
    restaurant_name: (row.restaurant_name as string | null) ?? null,
    profile: (row.profile as TrialRecord["profile"]) ?? null,
    weekly_hours: (row.weekly_hours as TrialRecord["weekly_hours"]) ?? null,
    menu: (row.menu as TrialRecord["menu"]) ?? null,
    menu_source: (row.menu_source as TrialRecord["menu_source"]) ?? null,
    menu_source_url: (row.menu_source_url as string | null) ?? null,
    knowledge: Array.isArray(row.knowledge) ? (row.knowledge as TrialRecord["knowledge"]) : [],
    persona:
      row.persona && typeof row.persona === "object"
        ? (row.persona as TrialRecord["persona"])
        : {},
    prompt: (row.prompt as string | null) ?? null,
    greeting: (row.greeting as string | null) ?? null,
    place_id: (row.place_id as string | null) ?? null,
    transcript: (row.transcript as TrialRecord["transcript"]) ?? null,
    scorecard:
      row.scorecard && typeof row.scorecard === "object"
        ? (row.scorecard as TrialRecord["scorecard"])
        : {},
    call_count: Number(row.call_count ?? 0),
    claimed_restaurant_id: (row.claimed_restaurant_id as string | null) ?? null,
    claimed_organization_id: (row.claimed_organization_id as string | null) ?? null,
    claimed_at: (row.claimed_at as string | null) ?? null,
    error: (row.error as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    expires_at: String(row.expires_at),
  };
}

let lastSweepAt = 0;

/** Best-effort cleanup of expired, unclaimed trials (at most once per hour per process). */
async function sweepExpiredTrials(db: Db): Promise<void> {
  const now = Date.now();
  if (now - lastSweepAt < 60 * 60 * 1000) return;
  lastSweepAt = now;
  try {
    await db
      .from("agent_trials")
      .delete()
      .lt("expires_at", new Date(now).toISOString())
      .is("claimed_restaurant_id", null);
  } catch {
    // Sweep is optional.
  }
}

export async function insertTrial(input: {
  tokenHash: string;
  sourceInput: string;
  sourceKind: TrialRecord["source_kind"];
}): Promise<TrialRecord> {
  const db = requireTrialDb();
  void sweepExpiredTrials(db);
  const { data, error } = await db
    .from("agent_trials")
    .insert({
      token_hash: input.tokenHash,
      source_input: input.sourceInput.slice(0, 500),
      source_kind: input.sourceKind,
      status: "resolving",
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return asRecord(data as Record<string, unknown>);
}

export async function getTrial(trialId: string): Promise<(TrialRecord & { token_hash: string }) | null> {
  const db = requireTrialDb();
  const { data, error } = await db
    .from("agent_trials")
    .select("*")
    .eq("id", trialId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data as Record<string, unknown>;
  return { ...asRecord(row), token_hash: String(row.token_hash) };
}

export async function updateTrial(
  trialId: string,
  patch: Record<string, unknown>
): Promise<TrialRecord> {
  const db = requireTrialDb();
  const { data, error } = await db
    .from("agent_trials")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", trialId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return asRecord(data as Record<string, unknown>);
}

export function upsertStep(
  log: TrialStepLogEntry[],
  entry: { id: TrialStepId; status: TrialStepStatus; title: string; detail?: string | null }
): TrialStepLogEntry[] {
  const next = log.filter((s) => s.id !== entry.id);
  next.push({
    id: entry.id,
    status: entry.status,
    title: entry.title,
    detail: entry.detail ?? null,
    at: new Date().toISOString(),
  });
  const order: TrialStepId[] = ["listing", "menu", "agent"];
  return next.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
}

export function toPublicView(trial: TrialRecord): TrialPublicView {
  const menu = trial.menu;
  const items = menu
    ? menu.categories.flatMap((c) =>
        c.items.map((i) => ({ name: i.name, price: i.price ?? null, category: c.name }))
      )
    : [];
  return {
    id: trial.id,
    status: trial.status,
    sourceKind: trial.source_kind,
    sourceInput: trial.source_input,
    steps: trial.step_log,
    restaurantName: trial.restaurant_name,
    profile: trial.profile,
    hours: trial.weekly_hours,
    menuSummary: menu
      ? {
          source: trial.menu_source,
          sourceUrl: trial.menu_source_url,
          categoryCount: menu.categories.length,
          itemCount: items.length,
          sampleItems: items.slice(0, 6),
          allItems: items.slice(0, 400),
        }
      : null,
    knowledge: trial.knowledge,
    persona: resolveTrialPersona(trial.persona, trial.restaurant_name, trial.profile?.cuisine),
    greeting: trial.greeting,
    scorecard: trial.scorecard,
    callCount: trial.call_count,
    claimedRestaurantId: trial.claimed_restaurant_id,
    error: trial.error,
    expiresAt: trial.expires_at,
  };
}

/** Default global cap on demo calls per rolling 24h (override with TRIAL_DAILY_CALL_CAP). */
export const DEFAULT_TRIAL_DAILY_CALL_CAP = 200;

export function trialDailyCallCap(): number {
  const raw = Number(process.env.TRIAL_DAILY_CALL_CAP);
  return Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : DEFAULT_TRIAL_DAILY_CALL_CAP;
}

/** Sum of demo calls started across all trials in the last 24 hours. */
export async function countTrialCallsLast24h(): Promise<number> {
  const db = requireTrialDb();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await db
    .from("agent_trials")
    .select("call_count")
    .gte("updated_at", since)
    .gt("call_count", 0)
    .limit(5000);
  if (error) throw new Error(error.message);
  return (data ?? []).reduce((n, row) => n + Number((row as { call_count?: number }).call_count ?? 0), 0);
}
