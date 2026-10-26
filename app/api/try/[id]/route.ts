import { NextResponse } from "next/server";
import { requireTrialFromCookie } from "@/lib/trial/auth";
import { toPublicView } from "@/lib/trial/store";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireTrialFromCookie(params.id);
  if (!auth.ok) return auth.response;
  return NextResponse.json({ trial: toPublicView(auth.trial) });
}
