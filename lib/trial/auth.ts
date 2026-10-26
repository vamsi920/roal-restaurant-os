import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getTrial } from "@/lib/trial/store";
import {
  decodeTrialCookie,
  TRIAL_COOKIE_NAME,
  trialTokenMatches,
} from "@/lib/trial/token";
import type { TrialRecord } from "@/lib/trial/types";

export type TrialAuthResult =
  | { ok: true; trial: TrialRecord & { token_hash: string } }
  | { ok: false; response: NextResponse };

/** Route-handler guard: the trial id in the path must match the signed cookie. */
export async function requireTrialFromCookie(trialId: string): Promise<TrialAuthResult> {
  const cookie = decodeTrialCookie(cookies().get(TRIAL_COOKIE_NAME)?.value);
  if (!cookie || cookie.trialId !== trialId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "This test session has expired. Start again." }, { status: 404 }),
    };
  }
  const trial = await getTrial(trialId);
  if (!trial || !trialTokenMatches(cookie.token, trial.token_hash)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "This test session has expired. Start again." }, { status: 404 }),
    };
  }
  if (new Date(trial.expires_at).getTime() < Date.now()) {
    return {
      ok: false,
      response: NextResponse.json({ error: "This test session has expired. Start again." }, { status: 410 }),
    };
  }
  return { ok: true, trial };
}

/** Server-component helper: pending (unclaimed) trial from the cookie, or null. */
export async function readPendingTrialFromCookie(): Promise<(TrialRecord & { token_hash: string }) | null> {
  const cookie = decodeTrialCookie(cookies().get(TRIAL_COOKIE_NAME)?.value);
  if (!cookie) return null;
  try {
    const trial = await getTrial(cookie.trialId);
    if (!trial || !trialTokenMatches(cookie.token, trial.token_hash)) return null;
    if (new Date(trial.expires_at).getTime() < Date.now()) return null;
    return trial;
  } catch {
    return null;
  }
}
