import { NextResponse } from "next/server";
import { EnvValidationError } from "@/lib/env.shared";
import { clientIpFromRequest, SlidingWindowRateLimiter } from "@/lib/restaurant-lookup/rate-limit";
import { requireTrialFromCookie } from "@/lib/trial/auth";
import { saveTrialLead, validateLead } from "@/lib/trial/lead";

export const runtime = "nodejs";

const leadLimiter = new SlidingWindowRateLimiter(6, 10 * 60 * 1000);

/** Save the owner's name, phone and email from the /start funnel, then ring them if we can. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!leadLimiter.check(clientIpFromRequest(req)).allowed) {
    return NextResponse.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429 });
  }
  const auth = await requireTrialFromCookie(params.id);
  if (!auth.ok) return auth.response;

  const parsed = validateLead(await req.json().catch(() => null));
  if (!parsed.ok) {
    return NextResponse.json({ error: "Check the highlighted fields.", fields: parsed.errors }, { status: 400 });
  }

  try {
    const { callStatus } = await saveTrialLead(auth.trial, parsed.lead);
    return NextResponse.json({ ok: true, callStatus, phone: parsed.lead.phone });
  } catch (e) {
    if (e instanceof EnvValidationError) {
      return NextResponse.json({ error: "Sign-ups are not configured on this server yet." }, { status: 503 });
    }
    console.error("[try lead]", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Could not save your details. Try again." }, { status: 500 });
  }
}
