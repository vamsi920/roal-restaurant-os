import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth/context-server";
import { isPlatformAdminEmail } from "@/lib/auth/platform-admin";
import { getDb } from "@/lib/db";
import { provisionPhoneLinesForOrganization } from "@/lib/telephony/provision-phone-line";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * ROAL staff: start an organization's plan and give every location its own phone line.
 * Self-serve checkout will call provisionPhoneLinesForOrganization the same way once payment
 * is confirmed.
 */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAuthContext();
  if (auth.errorResponse) return auth.errorResponse;
  if (!isPlatformAdminEmail(auth.context.user.email)) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  const db = getDb();
  const { data: org } = await db.from("organizations").select("id").eq("id", params.id).maybeSingle();
  if (!org) return NextResponse.json({ error: "Organization not found." }, { status: 404 });

  const { error } = await db
    .from("organizations")
    .update({ subscription_status: "active", updated_at: new Date().toISOString() })
    .eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const lines = await provisionPhoneLinesForOrganization(db, params.id);
  return NextResponse.json({ ok: true, lines });
}
