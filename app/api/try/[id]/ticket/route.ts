import { NextResponse } from "next/server";
import { extractOrderFromCall } from "@/lib/ai";
import { clientIpFromRequest, SlidingWindowRateLimiter } from "@/lib/restaurant-lookup/rate-limit";
import { requireTrialFromCookie } from "@/lib/trial/auth";
import { buildLiveTicket, menuLinesForPrompt } from "@/lib/trial/live-ticket";

export const runtime = "nodejs";

/** A demo call re-reads the ticket after each host reply; this caps a runaway client. */
const ticketLimiter = new SlidingWindowRateLimiter(150, 10 * 60 * 1000);

/** Live order ticket for an in-progress demo call, rebuilt from the transcript so far. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!ticketLimiter.check(clientIpFromRequest(req)).allowed) {
    return NextResponse.json({ error: "Slow down a little." }, { status: 429 });
  }
  const auth = await requireTrialFromCookie(params.id);
  if (!auth.ok) return auth.response;
  if (!auth.trial.menu) return NextResponse.json({ ticket: null });

  const body = (await req.json().catch(() => ({}))) as { turns?: unknown };
  const turns = Array.isArray(body.turns) ? body.turns.slice(-60) : [];
  const transcript = turns
    .map((t) => {
      const turn = (t ?? {}) as { role?: unknown; text?: unknown };
      const text = typeof turn.text === "string" ? turn.text.slice(0, 600) : "";
      return text ? `${turn.role === "user" ? "CALLER" : "HOST"}: ${text}` : "";
    })
    .filter(Boolean)
    .join("\n");

  try {
    const draft = await extractOrderFromCall(menuLinesForPrompt(auth.trial.menu), transcript);
    return NextResponse.json({ ticket: buildLiveTicket(auth.trial.menu, draft) });
  } catch (e) {
    console.error("[try ticket]", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Ticket unavailable." }, { status: 502 });
  }
}
