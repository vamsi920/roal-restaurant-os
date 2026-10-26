import { NextResponse } from "next/server";
import { requireTrialFromCookie } from "@/lib/trial/auth";
import { parseTrialInput } from "@/lib/trial/input";
import { resolveTrialListing } from "@/lib/trial/pipeline";
import { toPublicView } from "@/lib/trial/store";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireTrialFromCookie(params.id);
  if (!auth.ok) return auth.response;
  const parsed = parseTrialInput(auth.trial.source_input);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  try {
    const result = await resolveTrialListing(auth.trial.id, parsed);
    if (!result.ok) {
      return NextResponse.json({ error: result.message, trial: toPublicView(result.trial) }, { status: 422 });
    }
    return NextResponse.json({ trial: toPublicView(result.trial) });
  } catch (e) {
    console.error("[try listing]", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Could not read that restaurant. Try another link." }, { status: 500 });
  }
}
