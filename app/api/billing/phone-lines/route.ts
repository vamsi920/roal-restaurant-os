import { NextResponse } from "next/server";
import { requireAuthContext } from "@/lib/auth/context-server";
import { isOrgAdmin } from "@/lib/auth/roles";
import { getDb } from "@/lib/db";
import { provisionPhoneLinesForOrganization } from "@/lib/telephony/provision-phone-line";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Owner returns from payment: make sure every location has its phone line. The payment event
 * does the same in the background; this is idempotent, so whichever runs first wins.
 */
export async function POST() {
  const auth = await requireAuthContext();
  if (auth.errorResponse) return auth.errorResponse;
  const membership = auth.context.primaryMembership;
  if (!membership || !isOrgAdmin(membership.role)) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  const db = getDb();
  const { data: org } = await db
    .from("organizations")
    .select("subscription_status")
    .eq("id", membership.organization_id)
    .maybeSingle<{ subscription_status: string | null }>();
  if (org?.subscription_status !== "active") {
    return NextResponse.json({ error: "Your plan isn't active yet." }, { status: 409 });
  }

  const lines = await provisionPhoneLinesForOrganization(db, membership.organization_id);
  return NextResponse.json({
    ok: true,
    lines: lines.map((l) => ({
      restaurantId: l.restaurantId,
      phoneNumber: l.result.ok ? l.result.phoneNumber : null,
    })),
  });
}
