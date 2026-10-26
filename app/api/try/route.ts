import { NextResponse } from "next/server";
import { EnvValidationError } from "@/lib/env.shared";
import {
  clientIpFromRequest,
  SlidingWindowRateLimiter,
} from "@/lib/restaurant-lookup/rate-limit";
import { parseTrialInput } from "@/lib/trial/input";
import { insertTrial, toPublicView, TrialStoreUnavailableError } from "@/lib/trial/store";
import {
  encodeTrialCookie,
  generateTrialToken,
  hashTrialToken,
  TRIAL_COOKIE_NAME,
  trialCookieOptions,
} from "@/lib/trial/token";

export const runtime = "nodejs";

const startLimiter = new SlidingWindowRateLimiter(8, 10 * 60 * 1000);

/** Start a try-a-call trial from a website / Google Maps link / "name, city". */
export async function POST(req: Request) {
  const ip = clientIpFromRequest(req);
  if (!startLimiter.check(ip).allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in a few minutes." },
      { status: 429 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as { input?: unknown };
  const parsed = parseTrialInput(body.input);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const token = generateTrialToken();
    const sourceInput =
      parsed.kind === "name_city"
        ? [parsed.name, parsed.city].filter(Boolean).join(", ")
        : parsed.url;
    const trial = await insertTrial({
      tokenHash: hashTrialToken(token),
      sourceInput,
      sourceKind: parsed.kind,
    });
    const res = NextResponse.json({ trial: toPublicView(trial) });
    res.cookies.set(TRIAL_COOKIE_NAME, encodeTrialCookie(trial.id, token), trialCookieOptions());
    return res;
  } catch (e) {
    if (e instanceof TrialStoreUnavailableError || e instanceof EnvValidationError) {
      return NextResponse.json({ error: "Try-a-call is not configured yet." }, { status: 503 });
    }
    console.error("[try start]", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Could not start. Try again." }, { status: 500 });
  }
}
