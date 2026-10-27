import { readPendingTrialFromCookie } from "@/lib/trial/auth";

export type TrialHint = { restaurant: string | null };

/**
 * The `roal_trial` cookie is httpOnly, so auth pages learn about a pending
 * try-a-call trial here (server component) and pass only the restaurant name down.
 */
export async function readTrialHint(): Promise<TrialHint | null> {
  try {
    const trial = await readPendingTrialFromCookie();
    if (!trial || trial.status === "claimed" || trial.claimed_at) return null;
    const name = trial.restaurant_name?.trim() || trial.profile?.name?.trim() || null;
    return { restaurant: name };
  } catch {
    return null;
  }
}
